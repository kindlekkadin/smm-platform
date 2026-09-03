import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateManualTopUpSettingsDto } from './dto/update-manual-topup-settings.dto';

// Mirrors the gateway top-up cap — see PaymentsService. Just a sanity bound,
// not a real business limit (there's still nothing to spend a balance on).
const MAX_TOP_UP_AMOUNT = 100_000;

const SETTINGS_ID = 'singleton';

@Injectable()
export class ManualTopUpsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, amount: number, referenceNumber: string) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }
    if (amount > MAX_TOP_UP_AMOUNT) {
      throw new BadRequestException(`Amount exceeds the maximum allowed top-up of ${MAX_TOP_UP_AMOUNT}`);
    }
    const trimmedRef = referenceNumber.trim();
    if (!trimmedRef) {
      throw new BadRequestException('A payment reference number is required');
    }

    return this.prisma.walletTransaction.create({
      data: {
        userId,
        type: WalletTransactionType.MANUAL_TOP_UP,
        amount: new Prisma.Decimal(amount).toDecimalPlaces(2),
        status: WalletTransactionStatus.PENDING,
        referenceNumber: trimmedRef,
      },
    });
  }

  async listOwn(userId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { userId, type: WalletTransactionType.MANUAL_TOP_UP },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- Admin ----

  async adminListPending() {
    return this.prisma.walletTransaction.findMany({
      where: { type: WalletTransactionType.MANUAL_TOP_UP, status: WalletTransactionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
  }

  // A single conditional UPDATE (not a read-then-write) — the balance is
  // SUM(amount) WHERE status = COMPLETED, so flipping this one row's status
  // atomically is what "atomically increases the wallet balance" means
  // here. Scoping the WHERE to status = PENDING also means two concurrent
  // approve/reject calls on the same row can't both succeed.
  async adminApprove(id: string, adminUserId: string) {
    const result = await this.prisma.walletTransaction.updateMany({
      where: { id, type: WalletTransactionType.MANUAL_TOP_UP, status: WalletTransactionStatus.PENDING },
      data: {
        status: WalletTransactionStatus.COMPLETED,
        reviewedByAdminId: adminUserId,
        reviewedAt: new Date(),
      },
    });
    if (result.count === 0) {
      await this.throwNotFoundOrAlreadyReviewed(id);
    }
    return this.prisma.walletTransaction.findUniqueOrThrow({ where: { id } });
  }

  async adminReject(id: string, adminUserId: string, reason?: string) {
    const result = await this.prisma.walletTransaction.updateMany({
      where: { id, type: WalletTransactionType.MANUAL_TOP_UP, status: WalletTransactionStatus.PENDING },
      data: {
        status: WalletTransactionStatus.REJECTED,
        reviewedByAdminId: adminUserId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
    if (result.count === 0) {
      await this.throwNotFoundOrAlreadyReviewed(id);
    }
    return this.prisma.walletTransaction.findUniqueOrThrow({ where: { id } });
  }

  private async throwNotFoundOrAlreadyReviewed(id: string): Promise<never> {
    const existing = await this.prisma.walletTransaction.findUnique({ where: { id } });
    if (!existing || existing.type !== WalletTransactionType.MANUAL_TOP_UP) {
      throw new NotFoundException('Manual top-up request not found');
    }
    throw new BadRequestException(`This request has already been reviewed (status: ${existing.status})`);
  }

  // ---- Settings ----

  async getSettings() {
    return this.prisma.manualTopUpSettings.findUnique({ where: { id: SETTINGS_ID } });
  }

  async adminUpdateSettings(dto: UpdateManualTopUpSettingsDto) {
    return this.prisma.manualTopUpSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...dto },
      update: dto,
    });
  }
}
