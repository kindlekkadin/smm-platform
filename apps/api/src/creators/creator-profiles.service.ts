import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatorProfile, CreatorVerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { AdminUpdateCreatorStatusDto } from './dto/admin-update-creator-status.dto';
import { isValidCreatorStatusTransition } from './creator-status';

@Injectable()
export class CreatorProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a CreatorProfile on first application, or — per the locked
   * reapplication rule — moves an existing REJECTED profile back into a new
   * PENDING review cycle. Never creates a second profile for the same user.
   */
  async apply(userId: string, dto: ApplyCreatorDto): Promise<CreatorProfile> {
    const existing = await this.prisma.creatorProfile.findUnique({ where: { userId } });

    if (!existing) {
      return this.prisma.creatorProfile.create({
        data: { userId, bio: dto.bio, verificationStatus: CreatorVerificationStatus.PENDING },
      });
    }

    if (existing.verificationStatus !== CreatorVerificationStatus.REJECTED) {
      throw new ConflictException(
        `You already have a creator profile (status: ${existing.verificationStatus})`,
      );
    }

    // Reapplication: reset to PENDING. Prior rejectionReason/reviewedAt/
    // reviewedByAdminId are left as-is until the next admin decision
    // overwrites them — the previous decision stays visible, it's just
    // superseded once reviewed again.
    return this.prisma.creatorProfile.update({
      where: { userId },
      data: {
        bio: dto.bio ?? existing.bio,
        verificationStatus: CreatorVerificationStatus.PENDING,
        appliedAt: new Date(),
      },
    });
  }

  async getOwnProfile(userId: string): Promise<CreatorProfile> {
    return this.resolveOwnProfile(userId);
  }

  async updateOwnProfile(userId: string, dto: UpdateCreatorProfileDto): Promise<CreatorProfile> {
    const profile = await this.resolveOwnProfile(userId);
    return this.prisma.creatorProfile.update({
      where: { id: profile.id },
      data: { bio: dto.bio },
    });
  }

  /** Used by other creator-side services to resolve the acting creator. */
  async resolveOwnProfile(userId: string): Promise<CreatorProfile> {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('You have not applied to become a creator yet');
    }
    return profile;
  }

  // ---- Admin ----

  async adminList(): Promise<CreatorProfile[]> {
    return this.prisma.creatorProfile.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async adminGet(id: string): Promise<CreatorProfile> {
    return this.findOrThrow(id);
  }

  async adminUpdateStatus(
    id: string,
    dto: AdminUpdateCreatorStatusDto,
    adminUserId: string,
  ): Promise<CreatorProfile> {
    const profile = await this.findOrThrow(id);
    if (!isValidCreatorStatusTransition(profile.verificationStatus, dto.status)) {
      throw new BadRequestException(
        `Cannot transition creator profile from ${profile.verificationStatus} to ${dto.status}`,
      );
    }

    return this.prisma.creatorProfile.update({
      where: { id },
      data: {
        verificationStatus: dto.status,
        reviewedAt: new Date(),
        reviewedByAdminId: adminUserId,
        rejectionReason: dto.status === CreatorVerificationStatus.REJECTED ? dto.reason : null,
      },
    });
  }

  private async findOrThrow(id: string): Promise<CreatorProfile> {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }
    return profile;
  }
}
