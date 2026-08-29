import { Injectable } from '@nestjs/common';
import { CreatorEarning, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorProfilesService } from './creator-profiles.service';

@Injectable()
export class CreatorEarningsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorProfiles: CreatorProfilesService,
  ) {}

  /** Sum of unpaid (not yet linked to a PayoutRequest) earnings. */
  async getAvailableBalance(creatorProfileId: string): Promise<Prisma.Decimal> {
    const unpaid = await this.prisma.creatorEarning.findMany({
      where: { creatorProfileId, payoutRequestId: null },
      select: { amount: true },
    });
    return unpaid.reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));
  }

  async getOwnBalance(userId: string): Promise<{ balance: string; earnings: CreatorEarning[] }> {
    const profile = await this.creatorProfiles.resolveOwnProfile(userId);
    const earnings = await this.prisma.creatorEarning.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    const balance = await this.getAvailableBalance(profile.id);
    return { balance: balance.toString(), earnings };
  }
}
