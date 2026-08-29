import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentStatus, CreatorOfferingStatus, CreatorVerificationStatus, OrderAssignment, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateEstimatedPrice } from '../services/pricing';
import { CreatorProfilesService } from './creator-profiles.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { isValidAssignmentTransition } from './assignment-status';

const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = [AssignmentStatus.OFFERED, AssignmentStatus.ACCEPTED];

@Injectable()
export class OrderAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorProfiles: CreatorProfilesService,
  ) {}

  // ---- Admin ----

  async adminCreate(orderId: string, dto: CreateAssignmentDto): Promise<OrderAssignment> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        'Only orders that are CONFIRMED or already PROCESSING (reassignment) can be assigned',
      );
    }

    const activeExisting = await this.prisma.orderAssignment.findFirst({
      where: { orderId, status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
    });
    if (activeExisting) {
      throw new BadRequestException('This order already has an active assignment');
    }

    const offering = await this.prisma.creatorOffering.findUnique({
      where: { id: dto.creatorOfferingId },
      include: { creatorProfile: true },
    });
    if (!offering) {
      throw new NotFoundException('Creator offering not found');
    }
    if (offering.serviceId !== order.serviceId) {
      throw new BadRequestException('This offering is not for the same service as the order');
    }
    if (offering.status !== CreatorOfferingStatus.APPROVED || !offering.active) {
      throw new BadRequestException('This offering is not approved and active');
    }
    if (offering.creatorProfile.verificationStatus !== CreatorVerificationStatus.APPROVED) {
      throw new BadRequestException('This creator is not an approved creator');
    }
    if (order.quantity < offering.minQuantity || order.quantity > offering.maxQuantity) {
      throw new BadRequestException(
        `This offering only accepts quantities between ${offering.minQuantity} and ${offering.maxQuantity}`,
      );
    }

    return this.prisma.orderAssignment.create({
      data: {
        orderId,
        creatorProfileId: offering.creatorProfileId,
        creatorOfferingId: offering.id,
        // Snapshot — frozen even if CreatorOffering's price changes later.
        creatorPricePerThousand: offering.creatorPricePerThousand,
        status: AssignmentStatus.OFFERED,
      },
    });
  }

  async adminListForOrder(orderId: string): Promise<OrderAssignment[]> {
    return this.prisma.orderAssignment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

  async adminCancel(id: string, reason?: string): Promise<OrderAssignment> {
    const assignment = await this.findOrThrow(id);
    if (!isValidAssignmentTransition(assignment.status, AssignmentStatus.CANCELLED)) {
      throw new BadRequestException(`Cannot cancel an assignment in ${assignment.status} status`);
    }

    // Per the locked design: cancelling an assignment never moves Order
    // backward (no PROCESSING -> CONFIRMED edge exists). The order is left
    // as-is and becomes reassignable via a new OrderAssignment.
    return this.prisma.orderAssignment.update({
      where: { id },
      data: { status: AssignmentStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: reason },
    });
  }

  // ---- Creator ----

  async listOwn(userId: string): Promise<OrderAssignment[]> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    return this.prisma.orderAssignment.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwn(userId: string, id: string): Promise<OrderAssignment> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    const assignment = await this.findOrThrow(id);
    if (assignment.creatorProfileId !== profile.id) {
      throw new ForbiddenException('You do not have access to this assignment');
    }
    return assignment;
  }

  async accept(userId: string, id: string): Promise<OrderAssignment> {
    const assignment = await this.getOwn(userId, id);
    if (!isValidAssignmentTransition(assignment.status, AssignmentStatus.ACCEPTED)) {
      throw new BadRequestException(`Cannot accept an assignment in ${assignment.status} status`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.orderAssignment.update({
        where: { id },
        data: { status: AssignmentStatus.ACCEPTED, respondedAt: new Date() },
      });

      const order = await tx.order.findUnique({ where: { id: updated.orderId } });
      if (order?.status === OrderStatus.CONFIRMED) {
        await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.PROCESSING } });
      }

      return updated;
    });
  }

  async reject(userId: string, id: string, reason?: string): Promise<OrderAssignment> {
    const assignment = await this.getOwn(userId, id);
    if (!isValidAssignmentTransition(assignment.status, AssignmentStatus.REJECTED)) {
      throw new BadRequestException(`Cannot reject an assignment in ${assignment.status} status`);
    }

    // Order was never advanced while still OFFERED, so nothing to revert.
    return this.prisma.orderAssignment.update({
      where: { id },
      data: { status: AssignmentStatus.REJECTED, respondedAt: new Date(), rejectionReason: reason },
    });
  }

  async complete(userId: string, id: string): Promise<OrderAssignment> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    if (profile.verificationStatus !== CreatorVerificationStatus.APPROVED) {
      throw new ForbiddenException('Only an approved creator can complete fulfillment');
    }

    const assignment = await this.getOwn(userId, id);
    if (!isValidAssignmentTransition(assignment.status, AssignmentStatus.COMPLETED)) {
      throw new BadRequestException(`Cannot complete an assignment in ${assignment.status} status`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.orderAssignment.update({
        where: { id },
        data: { status: AssignmentStatus.COMPLETED, completedAt: new Date() },
      });

      const order = await tx.order.findUniqueOrThrow({ where: { id: updated.orderId } });
      if (order.status === OrderStatus.PROCESSING) {
        await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.COMPLETED } });
      }

      // earning = creatorPricePerThousand * quantity / 1000 — the locked
      // Option A formula, computed once from the frozen snapshot. No
      // commission model exists or is invented here.
      const amount = calculateEstimatedPrice(updated.creatorPricePerThousand, order.quantity);
      await tx.creatorEarning.create({
        data: {
          creatorProfileId: updated.creatorProfileId,
          orderAssignmentId: updated.id,
          amount,
        },
      });

      return updated;
    });
  }

  private async findOrThrow(id: string): Promise<OrderAssignment> {
    const assignment = await this.prisma.orderAssignment.findUnique({ where: { id } });
    if (!assignment) {
      throw new NotFoundException('Order assignment not found');
    }
    return assignment;
  }
}
