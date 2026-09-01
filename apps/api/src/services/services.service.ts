import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PricingModel, Prisma, Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { assertQuantityInRange, calculatePrice } from './pricing';

function assertQuantityRangeIsValid(minQuantity: number, maxQuantity: number): void {
  if (minQuantity > maxQuantity) {
    throw new BadRequestException('minQuantity cannot be greater than maxQuantity');
  }
}

function assertPriceMatchesPricingModel(
  pricingModel: PricingModel,
  pricePerThousand: number | undefined,
  flatPrice: number | undefined,
): void {
  if (pricingModel === PricingModel.PER_THOUSAND && pricePerThousand === undefined) {
    throw new BadRequestException('pricePerThousand is required for PER_THOUSAND pricing');
  }
  if (pricingModel === PricingModel.FLAT && flatPrice === undefined) {
    throw new BadRequestException('flatPrice is required for FLAT pricing');
  }
}

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Admin ----

  async adminCreate(dto: CreateServiceDto): Promise<Service> {
    assertQuantityRangeIsValid(dto.minQuantity, dto.maxQuantity);
    assertPriceMatchesPricingModel(dto.pricingModel, dto.pricePerThousand, dto.flatPrice);

    const existing = await this.prisma.service.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('A service with this slug already exists');
    }

    return this.prisma.service.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        category: dto.category,
        platform: dto.platform,
        pricingModel: dto.pricingModel,
        pricePerThousand:
          dto.pricingModel === PricingModel.PER_THOUSAND ? new Prisma.Decimal(dto.pricePerThousand!) : undefined,
        flatPrice: dto.pricingModel === PricingModel.FLAT ? new Prisma.Decimal(dto.flatPrice!) : undefined,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        estimatedDelivery: dto.estimatedDelivery,
      },
    });
  }

  async adminUpdate(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findByIdOrThrow(id);

    const minQuantity = dto.minQuantity ?? service.minQuantity;
    const maxQuantity = dto.maxQuantity ?? service.maxQuantity;
    assertQuantityRangeIsValid(minQuantity, maxQuantity);

    const pricingModel = dto.pricingModel ?? service.pricingModel;
    // Only enforce presence of the matching price field when the pricing
    // model is actually changing, or that field is being touched — a plain
    // "update minQuantity" call shouldn't have to resend the price.
    if (dto.pricingModel !== undefined || dto.pricePerThousand !== undefined || dto.flatPrice !== undefined) {
      const pricePerThousand =
        dto.pricePerThousand ?? (pricingModel === service.pricingModel ? service.pricePerThousand?.toNumber() : undefined);
      const flatPrice =
        dto.flatPrice ?? (pricingModel === service.pricingModel ? service.flatPrice?.toNumber() : undefined);
      assertPriceMatchesPricingModel(pricingModel, pricePerThousand, flatPrice);
    }

    if (dto.slug && dto.slug !== service.slug) {
      const existing = await this.prisma.service.findUnique({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException('A service with this slug already exists');
      }
    }

    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        category: dto.category,
        platform: dto.platform,
        pricingModel: dto.pricingModel,
        pricePerThousand:
          dto.pricePerThousand !== undefined ? new Prisma.Decimal(dto.pricePerThousand) : undefined,
        flatPrice: dto.flatPrice !== undefined ? new Prisma.Decimal(dto.flatPrice) : undefined,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        estimatedDelivery: dto.estimatedDelivery,
      },
    });
  }

  async adminSetActive(id: string, active: boolean): Promise<Service> {
    await this.findByIdOrThrow(id);
    return this.prisma.service.update({ where: { id }, data: { active } });
  }

  async adminGet(id: string): Promise<Service> {
    return this.findByIdOrThrow(id);
  }

  async adminList(): Promise<Service[]> {
    return this.prisma.service.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // ---- Customer catalog (active services only) ----

  async list(query: ListServicesQueryDto): Promise<Service[]> {
    const where: Prisma.ServiceWhereInput = { active: true };

    if (query.platform) {
      where.platform = query.platform;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.service.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service || !service.active) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async estimate(id: string, quantity: number) {
    const service = await this.get(id);
    assertQuantityInRange(quantity, service.minQuantity, service.maxQuantity);
    const estimatedPrice = calculatePrice(
      service.pricingModel,
      service.pricePerThousand,
      service.flatPrice,
      quantity,
    );
    return {
      serviceId: service.id,
      quantity,
      pricingModel: service.pricingModel,
      pricePerThousand: service.pricePerThousand?.toString() ?? null,
      flatPrice: service.flatPrice?.toString() ?? null,
      estimatedPrice: estimatedPrice.toString(),
    };
  }

  private async findByIdOrThrow(id: string): Promise<Service> {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }
}
