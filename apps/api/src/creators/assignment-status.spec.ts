import { AssignmentStatus } from '@prisma/client';
import { isValidAssignmentTransition } from './assignment-status';

describe('isValidAssignmentTransition', () => {
  it('allows OFFERED -> ACCEPTED, REJECTED, CANCELLED', () => {
    expect(isValidAssignmentTransition(AssignmentStatus.OFFERED, AssignmentStatus.ACCEPTED)).toBe(true);
    expect(isValidAssignmentTransition(AssignmentStatus.OFFERED, AssignmentStatus.REJECTED)).toBe(true);
    expect(isValidAssignmentTransition(AssignmentStatus.OFFERED, AssignmentStatus.CANCELLED)).toBe(true);
  });

  it('allows ACCEPTED -> COMPLETED, CANCELLED', () => {
    expect(isValidAssignmentTransition(AssignmentStatus.ACCEPTED, AssignmentStatus.COMPLETED)).toBe(true);
    expect(isValidAssignmentTransition(AssignmentStatus.ACCEPTED, AssignmentStatus.CANCELLED)).toBe(true);
  });

  it('rejects skipping OFFERED straight to COMPLETED', () => {
    expect(isValidAssignmentTransition(AssignmentStatus.OFFERED, AssignmentStatus.COMPLETED)).toBe(false);
  });

  it('rejects any transition out of a terminal state', () => {
    expect(isValidAssignmentTransition(AssignmentStatus.COMPLETED, AssignmentStatus.ACCEPTED)).toBe(false);
    expect(isValidAssignmentTransition(AssignmentStatus.REJECTED, AssignmentStatus.ACCEPTED)).toBe(false);
    expect(isValidAssignmentTransition(AssignmentStatus.CANCELLED, AssignmentStatus.ACCEPTED)).toBe(false);
  });
});
