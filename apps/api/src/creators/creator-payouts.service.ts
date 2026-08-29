import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PayoutRequest, PayoutRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorProfilesService } from './creator-profiles.service';
import { AdminUpdatePayoutStatusDto } from './dto/admin-update-payout-status.dto';
import { isValidPayoutStatusTransition } from './payout-status';

@Injectable()
export class CreatorPayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorProfiles: CreatorProfilesService,
  ) {}

  async request(userId: string): Promise<PayoutRequest> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);

    return this.prisma.$transaction(async (tx) => {
      const unpaidEarnings = await tx.creatorEarning.findMany({
        where: { creatorProfileId: profile.id, payoutRequestId: null },
      });

      if (unpaidEarnings.length === 0) {
        throw new BadRequestException('No available balance to request a payout for');
      }

      const amount = unpaidEarnings.reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));

      const payoutRequest = await tx.payoutRequest.create({
        data: { creatorProfileId: profile.id, amount },
      });

      await tx.creatorEarning.updateMany({
        where: { id: { in: unpaidEarnings.map((e) => e.id) } },
        data: { payoutRequestId: payoutRequest.id },
      });

      return payoutRequest;
    });
  }

  async listOwn(userId: string): Promise<PayoutRequest[]> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    return this.prisma.payoutRequest.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async getOwn(userId: string, id: string): Promise<PayoutRequest> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    const payoutRequest = await this.findOrThrow(id);
    if (payoutRequest.creatorProfileId !== profile.id) {
      throw new ForbiddenException('You do not have access to this payout request');
    }
    return payoutRequest;
  }

  // ---- Admin ----

  async adminList(): Promise<PayoutRequest[]> {
    return this.prisma.payoutRequest.findMany({ orderBy: { requestedAt: 'desc' } });
  }

  async adminGet(id: string): Promise<PayoutRequest> {
    return this.findOrThrow(id);
  }

  async adminUpdateStatus(id: string, dto: AdminUpdatePayoutStatusDto): Promise<PayoutRequest> {
    const payoutRequest = await this.findOrThrow(id);
    if (!isValidPayoutStatusTransition(payoutRequest.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition payout request from ${payoutRequest.status} to ${dto.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === PayoutRequestStatus.REJECTED) {
        // Release the linked earnings back to available/unpaid.
        await tx.creatorEarning.updateMany({
          where: { payoutRequestId: id },
          data: { payoutRequestId: null },
        });
      }

      return tx.payoutRequest.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedAt:
            dto.status === PayoutRequestStatus.APPROVED || dto.status === PayoutRequestStatus.REJECTED
              ? new Date()
              : payoutRequest.reviewedAt,
          paidAt: dto.status === PayoutRequestStatus.PAID ? new Date() : payoutRequest.paidAt,
          rejectionReason: dto.status === PayoutRequestStatus.REJECTED ? dto.notes : payoutRequest.rejectionReason,
          adminNotes: dto.notes ?? payoutRequest.adminNotes,
        },
      });
    });
  }

  private async findOrThrow(id: string): Promise<PayoutRequest> {
    const payoutRequest = await this.prisma.payoutRequest.findUnique({ where: { id } });
    if (!payoutRequest) {
      throw new NotFoundException('Payout request not found');
    }
    return payoutRequest;
  }
}
