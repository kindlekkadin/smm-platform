import { OrderStatus } from '@prisma/client';
import { isValidAdminTransition } from './order-status';

describe('isValidAdminTransition', () => {
  it('allows PENDING -> CONFIRMED', () => {
    expect(isValidAdminTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
  });

  it('allows PENDING -> CANCELLED', () => {
    expect(isValidAdminTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
  });

  it('allows CONFIRMED -> PROCESSING -> COMPLETED chain', () => {
    expect(isValidAdminTransition(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)).toBe(true);
    expect(isValidAdminTransition(OrderStatus.PROCESSING, OrderStatus.COMPLETED)).toBe(true);
  });

  it('rejects skipping straight from PENDING to COMPLETED', () => {
    expect(isValidAdminTransition(OrderStatus.PENDING, OrderStatus.COMPLETED)).toBe(false);
  });

  it('rejects any transition out of a terminal state', () => {
    expect(isValidAdminTransition(OrderStatus.COMPLETED, OrderStatus.PENDING)).toBe(false);
    expect(isValidAdminTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false);
    expect(isValidAdminTransition(OrderStatus.FAILED, OrderStatus.PENDING)).toBe(false);
  });

  it('rejects a no-op transition to the same status', () => {
    expect(isValidAdminTransition(OrderStatus.PENDING, OrderStatus.PENDING)).toBe(false);
  });
});
