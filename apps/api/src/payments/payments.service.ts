import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  OrderStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProviderRegistry } from './providers/payment-provider-registry';

// A wallet top-up currently has no way to ever be spent — see the Add Funds
// page. This cap just guards against a fat-fingered or malicious amount,
// not any real business limit.
const MAX_TOP_UP_AMOUNT = 100_000;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async initiate(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be paid for');
    }

    // Only DEV_MOCK exists today — see PAYMENT_PROVIDER_INTEGRATION.md.
    const provider = this.registry.get(PaymentProvider.DEV_MOCK);

    const paymentId = randomUUID();
    // Always the order's frozen total — never a client-supplied amount.
    const amount = order.totalPrice;

    const { providerRef, redirectUrl } = await provider.createPayment({
      paymentId,
      orderId: order.id,
      userId,
      amount,
    });

    const payment = await this.prisma.payment.create({
      data: {
        id: paymentId,
        orderId: order.id,
        userId,
        provider: provider.provider,
        providerRef,
        amount,
        status: PaymentStatus.PENDING,
      },
    });

    return { payment, redirectUrl };
  }

  // PayMongo once it's configured; DEV_MOCK otherwise — exactly like order
  // payments, this becomes a real gateway automatically once real
  // credentials exist, with no code change needed at that point.
  private resolveActiveProvider(): PaymentProvider {
    return this.registry.has(PaymentProvider.PAYMONGO) ? PaymentProvider.PAYMONGO : PaymentProvider.DEV_MOCK;
  }

  async initiateTopUp(userId: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }
    if (amount > MAX_TOP_UP_AMOUNT) {
      throw new BadRequestException(`Amount exceeds the maximum allowed top-up of ${MAX_TOP_UP_AMOUNT}`);
    }

    const providerName = this.resolveActiveProvider();
    const provider = this.registry.get(providerName);

    const paymentId = randomUUID();
    const decimalAmount = new Prisma.Decimal(amount).toDecimalPlaces(2);

    const { providerRef, redirectUrl } = await provider.createPayment({
      paymentId,
      userId,
      amount: decimalAmount,
    });

    const payment = await this.prisma.payment.create({
      data: {
        id: paymentId,
        userId,
        provider: providerName,
        providerRef,
        amount: decimalAmount,
        purpose: PaymentPurpose.WALLET_TOP_UP,
        status: PaymentStatus.PENDING,
      },
    });

    return { payment, redirectUrl };
  }

  async getWalletBalance(userId: string) {
    // A PENDING (unreviewed) or REJECTED manual top-up must never count.
    const result = await this.prisma.walletTransaction.aggregate({
      where: { userId, status: WalletTransactionStatus.COMPLETED },
      _sum: { amount: true },
    });
    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  async listWalletTransactions(userId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, paymentId: string) {
    const payment = await this.findOrThrow(paymentId);
    if (payment.userId !== userId) {
      throw new ForbiddenException('You do not have access to this payment');
    }
    return payment;
  }

  async listForOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return this.prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

  async handleWebhook(
    providerName: PaymentProvider,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ) {
    const provider = this.registry.get(providerName);
    const event = provider.parseWebhookEvent(rawBody, headers);

    const payment = await this.prisma.payment.findUnique({ where: { providerRef: event.providerRef } });
    if (!payment) {
      throw new NotFoundException('Unknown payment reference');
    }

    // Idempotent: a payment already in a terminal state ignores replayed webhooks.
    if (payment.status !== PaymentStatus.PENDING) {
      return payment;
    }

    const nextStatus = event.outcome === 'SUCCEEDED' ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          failureReason: nextStatus === PaymentStatus.FAILED ? 'Payment provider reported failure' : null,
        },
      });

      if (nextStatus === PaymentStatus.SUCCEEDED) {
        if (payment.purpose === PaymentPurpose.WALLET_TOP_UP) {
          await tx.walletTransaction.create({
            data: {
              userId: payment.userId,
              type: WalletTransactionType.TOP_UP,
              amount: payment.amount,
              paymentId: payment.id,
            },
          });
        } else if (payment.orderId) {
          const order = await tx.order.findUnique({ where: { id: payment.orderId } });
          if (order?.status === OrderStatus.PENDING) {
            await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CONFIRMED } });
          }
        }
      }

      return updated;
    });
  }

  // ---- Admin ----

  async adminList() {
    return this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async adminGet(paymentId: string) {
    return this.findOrThrow(paymentId);
  }

  async refund(paymentId: string, reason?: string) {
    const payment = await this.findOrThrow(paymentId);
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Only a succeeded payment can be refunded');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED, refundReason: reason },
    });
  }

  private async findOrThrow(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }
}
