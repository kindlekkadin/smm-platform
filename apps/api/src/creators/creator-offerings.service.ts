import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatorOffering, CreatorOfferingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorProfilesService } from './creator-profiles.service';
import { CreateCreatorOfferingDto } from './dto/create-creator-offering.dto';
import { UpdateCreatorOfferingDto } from './dto/update-creator-offering.dto';
import { AdminUpdateOfferingStatusDto } from './dto/admin-update-offering-status.dto';
import { isValidOfferingStatusTransition } from './offering-status';

function assertQuantityRangeIsValid(minQuantity: number, maxQuantity: number): void {
  if (minQuantity > maxQuantity) {
    throw new BadRequestException('minQuantity cannot be greater than maxQuantity');
  }
}

@Injectable()
export class CreatorOfferingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorProfiles: CreatorProfilesService,
  ) {}

  async create(userId: string, dto: CreateCreatorOfferingDto): Promise<CreatorOffering> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);

    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    assertQuantityRangeIsValid(dto.minQuantity, dto.maxQuantity);

    const existing = await this.prisma.creatorOffering.findUnique({
      where: { creatorProfileId_serviceId: { creatorProfileId: profile.id, serviceId: dto.serviceId } },
    });
    if (existing) {
      throw new ConflictException('You already have an offering for this service');
    }

    return this.prisma.creatorOffering.create({
      data: {
        creatorProfileId: profile.id,
        serviceId: dto.serviceId,
        creatorPricePerThousand: new Prisma.Decimal(dto.creatorPricePerThousand),
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        notes: dto.notes,
      },
    });
  }

  async listOwn(userId: string): Promise<CreatorOffering[]> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    return this.prisma.creatorOffering.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwn(userId: string, id: string): Promise<CreatorOffering> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    const offering = await this.findOrThrow(id);
    if (offering.creatorProfileId !== profile.id) {
      throw new ForbiddenException('You do not have access to this offering');
    }
    return offering;
  }

  async update(userId: string, id: string, dto: UpdateCreatorOfferingDto): Promise<CreatorOffering> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    const offering = await this.findOrThrow(id);
    if (offering.creatorProfileId !== profile.id) {
      throw new ForbiddenException('You do not have access to this offering');
    }

    const minQuantity = dto.minQuantity ?? offering.minQuantity;
    const maxQuantity = dto.maxQuantity ?? offering.maxQuantity;
    assertQuantityRangeIsValid(minQuantity, maxQuantity);

    // Editing a rejected offering resubmits it for review.
    const nextStatus =
      offering.status === CreatorOfferingStatus.REJECTED ? CreatorOfferingStatus.PENDING : offering.status;

    return this.prisma.creatorOffering.update({
      where: { id },
      data: {
        creatorPricePerThousand:
          dto.creatorPricePerThousand !== undefined
            ? new Prisma.Decimal(dto.creatorPricePerThousand)
            : undefined,
        minQuantity: dto.minQuantity,
        maxQuantity: dto.maxQuantity,
        notes: dto.notes,
        active: dto.active,
        status: nextStatus,
      },
    });
  }

  // ---- Admin ----

  async adminList(): Promise<CreatorOffering[]> {
    return this.prisma.creatorOffering.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async adminGet(id: string): Promise<CreatorOffering> {
    return this.findOrThrow(id);
  }

  async adminUpdateStatus(id: string, dto: AdminUpdateOfferingStatusDto): Promise<CreatorOffering> {
    const offering = await this.findOrThrow(id);
    if (!isValidOfferingStatusTransition(offering.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition offering from ${offering.status} to ${dto.status}`,
      );
    }
    return this.prisma.creatorOffering.update({ where: { id }, data: { status: dto.status } });
  }

  private async findOrThrow(id: string): Promise<CreatorOffering> {
    const offering = await this.prisma.creatorOffering.findUnique({ where: { id } });
    if (!offering) {
      throw new NotFoundException('Creator offering not found');
    }
    return offering;
  }
}
