import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, ProviderOrderSubmission, ProviderSubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProvidersService } from './providers.service';
import { ProviderRegistry } from './adapters/provider-registry';
import { DispatchOrderDto } from './dto/dispatch-order.dto';
import { calculateEstimatedPrice } from '../services/pricing';

const ACTIVE_SUBMISSION_STATUSES: ProviderSubmissionStatus[] = [
  ProviderSubmissionStatus.PENDING,
  ProviderSubmissionStatus.SUBMITTED,
  ProviderSubmissionStatus.IN_PROGRESS,
];

@Injectable()
export class ProviderOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProvidersService,
    private readonly registry: ProviderRegistry,
  ) {}

  // ---- Admin ----

  async dispatch(orderId: string, dto: DispatchOrderDto): Promise<ProviderOrderSubmission> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        'Only orders that are CONFIRMED or already PROCESSING (retry/redispatch) can be dispatched to a provider',
      );
    }

    const activeExisting = await this.prisma.providerOrderSubmission.findFirst({
      where: { orderId, status: { in: ACTIVE_SUBMISSION_STATUSES } },
    });
    if (activeExisting) {
      throw new BadRequestException('This order already has an active provider submission');
    }

    const mapping = await this.prisma.providerServiceMapping.findUnique({
      where: { id: dto.providerServiceMappingId },
      include: { provider: true },
    });
    if (!mapping) {
      throw new NotFoundException('Provider service mapping not found');
    }
    if (mapping.serviceId !== order.serviceId) {
      throw new BadRequestException('This mapping is not for the same service as the order');
    }
    if (!mapping.active || !mapping.provider.isActive) {
      throw new BadRequestException('This provider or mapping is not active');
    }
    if (mapping.minQuantity !== null && order.quantity < mapping.minQuantity) {
      throw new BadRequestException(`This mapping requires a quantity of at least ${mapping.minQuantity}`);
    }
    if (mapping.maxQuantity !== null && order.quantity > mapping.maxQuantity) {
      throw new BadRequestException(`This mapping allows a quantity of at most ${mapping.maxQuantity}`);
    }

    // Frozen at dispatch time, never recomputed on retry — mirrors
    // CreatorEarning's frozen-price pattern. Null if the mapping has no
    // configured cost.
    const cost = mapping.providerPricePerThousand
      ? calculateEstimatedPrice(mapping.providerPricePerThousand, order.quantity)
      : null;

    const submission = await this.prisma.providerOrderSubmission.create({
      data: {
        orderId: order.id,
        providerId: mapping.providerId,
        providerServiceMappingId: mapping.id,
        status: ProviderSubmissionStatus.PENDING,
        cost,
      },
    });

    return this.attemptSubmit(submission.id);
  }

  async retry(submissionId: string): Promise<ProviderOrderSubmission> {
    const submission = await this.findOrThrow(submissionId);
    if (submission.status !== ProviderSubmissionStatus.FAILED) {
      throw new BadRequestException('Only a failed submission can be retried');
    }
    return this.attemptSubmit(submissionId);
  }

  async poll(submissionId: string): Promise<ProviderOrderSubmission> {
    const submission = await this.findOrThrow(submissionId);
    if (
      submission.status !== ProviderSubmissionStatus.SUBMITTED &&
      submission.status !== ProviderSubmissionStatus.IN_PROGRESS
    ) {
      throw new BadRequestException(`Cannot poll a submission in ${submission.status} status`);
    }
    if (!submission.providerOrderRef) {
      throw new BadRequestException('This submission has no provider order reference yet');
    }

    const adapter = this.registry.get(submission.provider.code);
    const credentials = await this.providers.resolveCredentials(submission.providerId);
    const result = await adapter.checkStatus(submission.providerOrderRef, credentials);

    return this.applyOutcome(submission, result.outcome, result.externalStatus);
  }

  async cancel(submissionId: string, reason?: string): Promise<ProviderOrderSubmission> {
    const submission = await this.findOrThrow(submissionId);
    if (!ACTIVE_SUBMISSION_STATUSES.includes(submission.status)) {
      throw new BadRequestException(`Cannot cancel a submission in ${submission.status} status`);
    }

    return this.prisma.providerOrderSubmission.update({
      where: { id: submissionId },
      data: { status: ProviderSubmissionStatus.CANCELLED, cancelledAt: new Date(), lastError: reason },
    });
  }

  async listForOrder(orderId: string): Promise<ProviderOrderSubmission[]> {
    return this.prisma.providerOrderSubmission.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async adminList(): Promise<ProviderOrderSubmission[]> {
    return this.prisma.providerOrderSubmission.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async adminGet(id: string): Promise<ProviderOrderSubmission> {
    return this.findOrThrow(id);
  }

  // ---- Webhook (public route, see ProviderWebhookController) ----

  async handleWebhook(code: string, rawBody: string, headers: Record<string, string | undefined>) {
    const adapter = this.registry.get(code);
    const event = adapter.parseWebhookEvent(rawBody, headers);

    const submission = await this.prisma.providerOrderSubmission.findUnique({
      where: { providerOrderRef: event.providerOrderRef },
    });
    if (!submission) {
      throw new NotFoundException('Unknown provider order reference');
    }

    // Idempotent: a submission already in a terminal state ignores replayed webhooks.
    if (!ACTIVE_SUBMISSION_STATUSES.includes(submission.status)) {
      return submission;
    }

    return this.applyOutcome(submission, event.outcome, event.externalStatus);
  }

  // ---- internals ----

  private async attemptSubmit(submissionId: string): Promise<ProviderOrderSubmission> {
    const submission = await this.prisma.providerOrderSubmission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { provider: true, providerServiceMapping: true, order: true },
    });

    const adapter = this.registry.get(submission.provider.code);
    const credentials = await this.providers.resolveCredentials(submission.providerId);

    try {
      const result = await adapter.submitOrder(
        {
          submissionId: submission.id,
          orderId: submission.orderId,
          providerServiceId: submission.providerServiceMapping.providerServiceId,
          quantity: submission.order.quantity,
          targetIdentifier: submission.order.targetIdentifier,
        },
        credentials,
      );

      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.providerOrderSubmission.update({
          where: { id: submission.id },
          data: {
            status: ProviderSubmissionStatus.SUBMITTED,
            providerOrderRef: result.providerOrderRef,
            externalStatus: result.externalStatus,
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
            submittedAt: new Date(),
            lastError: null,
            responseLog: { ...result },
          },
        });

        if (submission.order.status === OrderStatus.CONFIRMED) {
          await tx.order.update({ where: { id: submission.orderId }, data: { status: OrderStatus.PROCESSING } });
        }

        return updated;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error';
      return this.prisma.providerOrderSubmission.update({
        where: { id: submission.id },
        data: {
          status: ProviderSubmissionStatus.FAILED,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          lastError: message,
        },
      });
    }
  }

  private async applyOutcome(
    submission: ProviderOrderSubmission,
    outcome: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    externalStatus: string,
  ): Promise<ProviderOrderSubmission> {
    if (outcome === 'IN_PROGRESS') {
      return this.prisma.providerOrderSubmission.update({
        where: { id: submission.id },
        data: { status: ProviderSubmissionStatus.IN_PROGRESS, externalStatus },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.providerOrderSubmission.update({
        where: { id: submission.id },
        data: {
          status: outcome === 'COMPLETED' ? ProviderSubmissionStatus.COMPLETED : ProviderSubmissionStatus.FAILED,
          externalStatus,
          completedAt: outcome === 'COMPLETED' ? new Date() : undefined,
          lastError: outcome === 'FAILED' ? 'Provider reported failure' : null,
        },
      });

      if (outcome === 'COMPLETED') {
        const order = await tx.order.findUniqueOrThrow({ where: { id: submission.orderId } });
        if (order.status === OrderStatus.PROCESSING) {
          await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.COMPLETED } });
        }
      }

      return updated;
    });
  }

  private async findOrThrow(id: string) {
    const submission = await this.prisma.providerOrderSubmission.findUnique({
      where: { id },
      include: { provider: true },
    });
    if (!submission) {
      throw new NotFoundException('Provider order submission not found');
    }
    return submission;
  }
}
