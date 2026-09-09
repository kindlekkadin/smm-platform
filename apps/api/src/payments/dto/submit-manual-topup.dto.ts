import { Min, Matches } from 'class-validator';

export const MIN_MANUAL_TOP_UP_AMOUNT = 15;

export class SubmitManualTopUpDto {
  @Min(MIN_MANUAL_TOP_UP_AMOUNT)
  amount!: number;

  // Exactly the last 6 digits of the transfer's reference number — not the
  // full reference, and not anything but digits.
  @Matches(/^\d{6}$/, { message: 'referenceNumber must be exactly 6 digits' })
  referenceNumber!: string;
}
