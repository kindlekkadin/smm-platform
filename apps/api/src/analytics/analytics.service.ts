import { Injectable } from '@nestjs/common';
import {
  AssignmentStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProviderSubmissionStatus,
  SocialPlatform,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { AnalyticsOrdersQueryDto } from './dto/analytics-orders-query.dto';
import { computeMarginPercent, determineChannel, FulfillmentChannel, roundMoney, sumDecimal } from './analytics.util';

export interface OrderLineItem {
  orderId: string;
  createdAt: Date;
  orderStatus: OrderStatus;
  serviceId: string;
  serviceName: string;
  platform: SocialPlatform;
  quantity: number;
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
  margin: Prisma.Decimal;
  channel: FulfillmentChannel;
  // Every fulfillment signal in this system is a channel's own self-report
  // (a creator marking done, or DEV_MOCK/a future provider's status) — there
  // is no real social platform integration to check it against actual
  // delivered counts. Never rename/repurpose this to imply verification.
  fulfillmentStatus: 'REPORTED' | 'NONE';
  isVerified: false;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(filters: AnalyticsFiltersDto) {
    const lineItems = await this.loadLineItems(filters);

    const grossRevenue = sumDecimal(lineItems.map((item) => item.revenue));
    const fulfillmentCost = sumDecimal(lineItems.map((item) => item.cost));
    const netMargin = roundMoney(grossRevenue.sub(fulfillmentCost));

    return {
      orderCount: lineItems.length,
      fulfilledOrderCount: lineItems.filter((item) => item.channel !== 'UNFULFILLED').length,
      grossRevenue,
      fulfillmentCost,
      netMargin,
      marginPercent: computeMarginPercent(grossRevenue, netMargin),
      fulfillmentStatus: 'REPORTED' as const,
      isVerified: false as const,
    };
  }

  async getBreakdowns(filters: AnalyticsFiltersDto) {
    const lineItems = await this.loadLineItems(filters);

    return {
      byChannel: this.groupAndSum(lineItems, (item) => item.channel),
      byService: this.groupAndSum(lineItems, (item) => item.serviceName),
      byPlatform: this.groupAndSum(lineItems, (item) => item.platform),
    };
  }

  async getOrderLineItems(query: AnalyticsOrdersQueryDto) {
    const lineItems = await this.loadLineItems(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;

    return {
      orders: lineItems.slice(start, start + pageSize),
      total: lineItems.length,
      page,
      pageSize,
    };
  }

  private groupAndSum(lineItems: OrderLineItem[], keyOf: (item: OrderLineItem) => string) {
    const groups = new Map<string, OrderLineItem[]>();
    for (const item of lineItems) {
      const key = keyOf(item);
      const existing = groups.get(key);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(key, [item]);
      }
    }

    return Array.from(groups.entries()).map(([key, items]) => {
      const revenue = sumDecimal(items.map((item) => item.revenue));
      const cost = sumDecimal(items.map((item) => item.cost));
      const margin = roundMoney(revenue.sub(cost));
      return {
        key,
        orderCount: items.length,
        revenue,
        cost,
        margin,
        marginPercent: computeMarginPercent(revenue, margin),
      };
    });
  }

  private async loadLineItems(filters: AnalyticsFiltersDto): Promise<OrderLineItem[]> {
    const where: Prisma.OrderWhereInput = {};
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      };
    }
    if (filters.serviceId) {
      where.serviceId = filters.serviceId;
    }
    if (filters.platform) {
      where.service = { platform: filters.platform };
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        status: true,
        quantity: true,
        service: { select: { id: true, name: true, platform: true } },
        payments: {
          where: { status: PaymentStatus.SUCCEEDED },
          select: { amount: true },
        },
        assignments: {
          where: { status: AssignmentStatus.COMPLETED },
          select: { earning: { select: { amount: true } } },
        },
        providerSubmissions: {
          where: { status: ProviderSubmissionStatus.COMPLETED },
          select: { cost: true },
        },
      },
    });

    return orders.map((order): OrderLineItem => {
      const revenue = sumDecimal(order.payments.map((payment) => payment.amount));
      const creatorCost = sumDecimal(
        order.assignments.map((assignment) => assignment.earning?.amount ?? new Prisma.Decimal(0)),
      );
      const providerCost = sumDecimal(
        order.providerSubmissions.map((submission) => submission.cost ?? new Prisma.Decimal(0)),
      );
      const cost = roundMoney(creatorCost.add(providerCost));
      const channel = determineChannel(order.assignments.length > 0, order.providerSubmissions.length > 0);

      return {
        orderId: order.id,
        createdAt: order.createdAt,
        orderStatus: order.status,
        serviceId: order.service.id,
        serviceName: order.service.name,
        platform: order.service.platform,
        quantity: order.quantity,
        revenue,
        cost,
        margin: roundMoney(revenue.sub(cost)),
        channel,
        fulfillmentStatus: channel === 'UNFULFILLED' ? 'NONE' : 'REPORTED',
        isVerified: false,
      };
    });
  }
}
