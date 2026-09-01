import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, SocialAccountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertQuantityInRange, calculatePrice } from '../services/pricing';
import { CreateOrderDto } from './dto/create-order.dto';
import { isValidAdminTransition, CUSTOMER_CANCELLABLE_STATUS } from './order-status';

const ORDER_SELECT = {
  id: true,
  userId: true,
  quantity: true,
  targetIdentifier: true,
  pricingModel: true,
  unitPricePerThousand: true,
  unitFlatPrice: true,
  totalPrice: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  service: {
    select: { id: true, name: true, slug: true, platform: true, category: true },
  },
  socialAccount: {
    select: { id: true, platform: true, username: true, status: true },
  },
} satisfies Prisma.OrderSelect;

export type PublicOrder = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto): Promise<PublicOrder> {
    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || !service.active) {
      throw new NotFoundException('Service not found');
    }

    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: { id: dto.socialAccountId },
    });
    if (!socialAccount) {
      throw new NotFoundException('Social account not found');
    }
    if (socialAccount.userId !== userId) {
      throw new ForbiddenException('This social account does not belong to you');
    }
    if (socialAccount.status !== SocialAccountStatus.ACTIVE) {
      throw new BadRequestException('This social account is not connected');
    }

    assertQuantityInRange(dto.quantity, service.minQuantity, service.maxQuantity);

    // Always computed server-side from the current Service record — never
    // trust a client-supplied price/total (CreateOrderDto has no such field).
    const totalPrice = calculatePrice(
      service.pricingModel,
      service.pricePerThousand,
      service.flatPrice,
      dto.quantity,
    );

    const order = await this.prisma.order.create({
      data: {
        userId,
        serviceId: service.id,
        socialAccountId: socialAccount.id,
        targetIdentifier: dto.targetIdentifier,
        quantity: dto.quantity,
        pricingModel: service.pricingModel,
        unitPricePerThousand: service.pricePerThousand,
        unitFlatPrice: service.flatPrice,
        totalPrice,
        status: OrderStatus.PENDING,
      },
      select: ORDER_SELECT,
    });
    return order;
  }

  async list(userId: string): Promise<PublicOrder[]> {
    return this.prisma.order.findMany({
      where: { userId },
      select: ORDER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, orderId: string): Promise<PublicOrder> {
    const order = await this.findOrThrow(orderId);
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return this.toPublic(order);
  }

  async cancel(userId: string, orderId: string): Promise<PublicOrder> {
    const order = await this.findOrThrow(orderId);
    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    if (order.status !== CUSTOMER_CANCELLABLE_STATUS) {
      throw new BadRequestException(
        `Only orders in ${CUSTOMER_CANCELLABLE_STATUS} status can be cancelled`,
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
      select: ORDER_SELECT,
    });
  }

  // ---- Admin ----

  async adminList(): Promise<PublicOrder[]> {
    return this.prisma.order.findMany({ select: ORDER_SELECT, orderBy: { createdAt: 'desc' } });
  }

  async adminGet(orderId: string): Promise<PublicOrder> {
    const order = await this.findOrThrow(orderId);
    return this.toPublic(order);
  }

  async adminUpdateStatus(orderId: string, nextStatus: OrderStatus): Promise<PublicOrder> {
    const order = await this.findOrThrow(orderId);
    if (!isValidAdminTransition(order.status, nextStatus)) {
      throw new BadRequestException(`Cannot transition order from ${order.status} to ${nextStatus}`);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
      select: ORDER_SELECT,
    });
  }

  private async findOrThrow(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private toPublic(order: { id: string }): Promise<PublicOrder> {
    // Re-select through the safe projection so callers can never end up with
    // sensitive fields even when findOrThrow fetched the full row.
    return this.prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: ORDER_SELECT });
  }
}
