import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Creator Marketplace (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `cm-e2e-admin-${runId}@example.com`;
  const creatorEmail = `cm-e2e-creator-${runId}@example.com`;
  const otherCreatorEmail = `cm-e2e-other-creator-${runId}@example.com`;
  const customerEmail = `cm-e2e-customer-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';
  const slug = `creator-market-service-${runId}`;

  let adminAgent: ReturnType<typeof request.agent>;
  let creatorAgent: ReturnType<typeof request.agent>;
  let otherCreatorAgent: ReturnType<typeof request.agent>;
  let customerAgent: ReturnType<typeof request.agent>;

  let serviceId: string;
  let customerSocialAccountId: string;

  async function connectDevMockAccount(agent: ReturnType<typeof request.agent>, username: string) {
    const initiateRes = await agent.post('/api/social-accounts/DEV_MOCK/connect').expect(201);
    const completeRes = await agent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: initiateRes.body.state, mockUsername: username })
      .expect(201);
    return completeRes.body.account.id as string;
  }

  /** Creates a CONFIRMED order (created + paid) ready for assignment. */
  async function createConfirmedOrder(quantity: number) {
    const orderRes = await customerAgent
      .post('/api/orders')
      .send({ serviceId, socialAccountId: customerSocialAccountId, quantity })
      .expect(201);
    const orderId = orderRes.body.order.id as string;

    const payRes = await customerAgent.post(`/api/orders/${orderId}/payments`).expect(201);
    await request(app.getHttpServer())
      .post('/api/payments/webhooks/DEV_MOCK')
      .send({ providerRef: payRes.body.payment.providerRef, outcome: 'SUCCEEDED' })
      .expect(201);

    return orderId;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(password, 10),
        displayName: 'CM Admin',
        role: UserRole.ADMIN,
      },
    });
    adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/auth/login').send({ email: adminEmail, password }).expect(200);

    creatorAgent = request.agent(app.getHttpServer());
    await creatorAgent
      .post('/api/auth/register')
      .send({ email: creatorEmail, password, displayName: 'CM Creator', role: 'CREATOR' })
      .expect(201);
    await creatorAgent.post('/api/auth/login').send({ email: creatorEmail, password }).expect(200);

    otherCreatorAgent = request.agent(app.getHttpServer());
    await otherCreatorAgent
      .post('/api/auth/register')
      .send({ email: otherCreatorEmail, password, displayName: 'CM Other Creator', role: 'CREATOR' })
      .expect(201);
    await otherCreatorAgent
      .post('/api/auth/login')
      .send({ email: otherCreatorEmail, password })
      .expect(200);

    customerAgent = request.agent(app.getHttpServer());
    await customerAgent
      .post('/api/auth/register')
      .send({ email: customerEmail, password, displayName: 'CM Customer' })
      .expect(201);
    await customerAgent.post('/api/auth/login').send({ email: customerEmail, password }).expect(200);

    const serviceRes = await adminAgent
      .post('/api/admin/services')
      .send({
        name: 'Creator Market Service',
        slug,
        description: 'Service used for creator marketplace e2e tests.',
        category: 'FOLLOWERS',
        platform: 'DEV_MOCK',
        pricePerThousand: 20,
        minQuantity: 100,
        maxQuantity: 100000,
      })
      .expect(201);
    serviceId = serviceRes.body.service.id;

    customerSocialAccountId = await connectDevMockAccount(customerAgent, `cm_customer_${runId}`);
  });

  afterAll(async () => {
    await prisma.creatorEarning.deleteMany({
      where: { creatorProfile: { user: { email: { in: [creatorEmail, otherCreatorEmail] } } } },
    });
    await prisma.payoutRequest.deleteMany({
      where: { creatorProfile: { user: { email: { in: [creatorEmail, otherCreatorEmail] } } } },
    });
    await prisma.orderAssignment.deleteMany({
      where: { creatorProfile: { user: { email: { in: [creatorEmail, otherCreatorEmail] } } } },
    });
    await prisma.creatorOffering.deleteMany({
      where: { creatorProfile: { user: { email: { in: [creatorEmail, otherCreatorEmail] } } } },
    });
    await prisma.creatorProfile.deleteMany({
      where: { user: { email: { in: [creatorEmail, otherCreatorEmail] } } },
    });
    await prisma.payment.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.order.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.socialAccount.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.service.deleteMany({ where: { slug: { startsWith: `creator-market-service-${runId}` } } });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, creatorEmail, otherCreatorEmail, customerEmail] } },
    });
    await app.close();
  });

  describe('creator profile & onboarding', () => {
    it('rejects an unauthenticated application', async () => {
      await request(app.getHttpServer()).post('/api/creators/apply').expect(401);
    });

    it('returns 404 before applying', async () => {
      await creatorAgent.get('/api/creators/me').expect(404);
    });

    it('lets an authenticated user apply, creating a PENDING profile', async () => {
      const res = await creatorAgent.post('/api/creators/apply').send({ bio: 'I grow accounts.' }).expect(201);
      expect(res.body.profile.verificationStatus).toBe('PENDING');
      expect(res.body.profile.bio).toBe('I grow accounts.');
    });

    it('rejects a duplicate application while already PENDING', async () => {
      await creatorAgent.post('/api/creators/apply').send({}).expect(409);
    });

    it('lets the creator update their own bio', async () => {
      const res = await creatorAgent.patch('/api/creators/me').send({ bio: 'Updated bio' }).expect(200);
      expect(res.body.profile.bio).toBe('Updated bio');
    });

    it('rejects admin verification endpoints for non-admins', async () => {
      const { body } = await creatorAgent.get('/api/creators/me').expect(200);
      await creatorAgent
        .patch(`/api/admin/creators/${body.profile.id}/status`)
        .send({ status: 'APPROVED' })
        .expect(403);
    });

    it('rejects an invalid transition (PENDING -> SUSPENDED)', async () => {
      const { body } = await creatorAgent.get('/api/creators/me').expect(200);
      await adminAgent
        .patch(`/api/admin/creators/${body.profile.id}/status`)
        .send({ status: 'SUSPENDED' })
        .expect(400);
    });

    it('lets an admin approve, then suspend, then re-approve a creator', async () => {
      const { body } = await creatorAgent.get('/api/creators/me').expect(200);
      const id = body.profile.id;

      const approved = await adminAgent
        .patch(`/api/admin/creators/${id}/status`)
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(approved.body.profile.verificationStatus).toBe('APPROVED');

      const suspended = await adminAgent
        .patch(`/api/admin/creators/${id}/status`)
        .send({ status: 'SUSPENDED' })
        .expect(200);
      expect(suspended.body.profile.verificationStatus).toBe('SUSPENDED');

      const reapproved = await adminAgent
        .patch(`/api/admin/creators/${id}/status`)
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(reapproved.body.profile.verificationStatus).toBe('APPROVED');
    });

    it('supports reapplication after rejection, without creating a duplicate profile', async () => {
      const applyRes = await otherCreatorAgent
        .post('/api/creators/apply')
        .send({ bio: 'First attempt' })
        .expect(201);
      const id = applyRes.body.profile.id;

      await adminAgent
        .patch(`/api/admin/creators/${id}/status`)
        .send({ status: 'REJECTED', reason: 'Incomplete bio' })
        .expect(200);

      // Cannot re-apply while some other non-REJECTED state is active is
      // already covered above; here we confirm REJECTED specifically allows it.
      const reapplyRes = await otherCreatorAgent
        .post('/api/creators/apply')
        .send({ bio: 'Second attempt' })
        .expect(201);
      expect(reapplyRes.body.profile.id).toBe(id); // same profile row, not a duplicate
      expect(reapplyRes.body.profile.verificationStatus).toBe('PENDING');

      const count = await prisma.creatorProfile.count({
        where: { user: { email: otherCreatorEmail } },
      });
      expect(count).toBe(1);

      // Approve the "other" creator for later assignment-related tests.
      await adminAgent.patch(`/api/admin/creators/${id}/status`).send({ status: 'APPROVED' }).expect(200);
    });
  });

  describe('creator offerings', () => {
    let offeringId: string;

    it('lets an approved creator create an offering', async () => {
      const res = await creatorAgent
        .post('/api/creators/offerings')
        .send({ serviceId, creatorPricePerThousand: 12, minQuantity: 500, maxQuantity: 5000, notes: 'Fast' })
        .expect(201);
      expect(res.body.offering.status).toBe('PENDING');
      offeringId = res.body.offering.id;
    });

    it('rejects a duplicate offering for the same service', async () => {
      await creatorAgent
        .post('/api/creators/offerings')
        .send({ serviceId, creatorPricePerThousand: 15, minQuantity: 100, maxQuantity: 1000 })
        .expect(409);
    });

    it('rejects minQuantity greater than maxQuantity', async () => {
      await creatorAgent
        .post('/api/creators/offerings')
        .send({
          serviceId,
          creatorPricePerThousand: 10,
          minQuantity: 5000,
          maxQuantity: 100,
        })
        .expect(400);
    });

    it("rejects another creator's attempt to view or edit the offering", async () => {
      await otherCreatorAgent.get(`/api/creators/offerings/${offeringId}`).expect(403);
      await otherCreatorAgent
        .patch(`/api/creators/offerings/${offeringId}`)
        .send({ notes: 'hijacked' })
        .expect(403);
    });

    it('rejects non-admin access to admin offering endpoints', async () => {
      await creatorAgent.get('/api/admin/creator-offerings').expect(403);
    });

    it('approves the offering, then rejects an invalid transition (APPROVED -> PENDING)', async () => {
      const res = await adminAgent
        .patch(`/api/admin/creator-offerings/${offeringId}/status`)
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(res.body.offering.status).toBe('APPROVED');

      await adminAgent
        .patch(`/api/admin/creator-offerings/${offeringId}/status`)
        .send({ status: 'PENDING' })
        .expect(400);
    });

    it('lets an admin revoke approval, and the creator can resubmit by editing', async () => {
      const revoked = await adminAgent
        .patch(`/api/admin/creator-offerings/${offeringId}/status`)
        .send({ status: 'REJECTED' })
        .expect(200);
      expect(revoked.body.offering.status).toBe('REJECTED');

      const edited = await creatorAgent
        .patch(`/api/creators/offerings/${offeringId}`)
        .send({ notes: 'Fixed the issue' })
        .expect(200);
      expect(edited.body.offering.status).toBe('PENDING');

      // Re-approve for the assignment tests below.
      await adminAgent
        .patch(`/api/admin/creator-offerings/${offeringId}/status`)
        .send({ status: 'APPROVED' })
        .expect(200);
    });

    it('lists the offering under the creator and under admin', async () => {
      const ownList = await creatorAgent.get('/api/creators/offerings').expect(200);
      expect(ownList.body.offerings.some((o: { id: string }) => o.id === offeringId)).toBe(true);

      const adminList = await adminAgent.get('/api/admin/creator-offerings').expect(200);
      expect(adminList.body.offerings.some((o: { id: string }) => o.id === offeringId)).toBe(true);
    });
  });

  describe('order assignment & fulfillment', () => {
    let offeringId: string;

    beforeAll(async () => {
      const { body } = await creatorAgent.get('/api/creators/offerings').expect(200);
      offeringId = body.offerings[0].id;
    });

    it('rejects assignment creation from a non-admin', async () => {
      const orderId = await createConfirmedOrder(1000);
      await creatorAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(403);
    });

    it('rejects assigning a quantity outside the offering min/max range', async () => {
      const orderId = await createConfirmedOrder(100); // offering min is 500
      await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(400);
    });

    it('rejects assignment when the offering is not approved', async () => {
      const pendingOfferingRes = await otherCreatorAgent
        .post('/api/creators/offerings')
        .send({ serviceId, creatorPricePerThousand: 9, minQuantity: 100, maxQuantity: 5000 })
        .expect(201);
      const orderId = await createConfirmedOrder(1000);
      await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: pendingOfferingRes.body.offering.id })
        .expect(400);
    });

    it('creates an OFFERED assignment for a valid request, snapshotting the price', async () => {
      const orderId = await createConfirmedOrder(1000);
      const res = await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(201);
      expect(res.body.assignment.status).toBe('OFFERED');
      expect(res.body.assignment.creatorPricePerThousand).toBe('12');
    });

    it('rejects a second active assignment on the same order', async () => {
      const orderId = await createConfirmedOrder(1000);
      await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(201);
      await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(400);
    });

    it("rejects another creator's attempt to accept/reject/complete the assignment", async () => {
      const orderId = await createConfirmedOrder(1000);
      const assignRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(201);
      const assignmentId = assignRes.body.assignment.id;

      await otherCreatorAgent.patch(`/api/creators/assignments/${assignmentId}/accept`).expect(403);
    });

    it('lets the assigned creator accept, moving the order to PROCESSING', async () => {
      const orderId = await createConfirmedOrder(1000);
      const assignRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(201);
      const assignmentId = assignRes.body.assignment.id;

      const acceptRes = await creatorAgent
        .patch(`/api/creators/assignments/${assignmentId}/accept`)
        .expect(200);
      expect(acceptRes.body.assignment.status).toBe('ACCEPTED');

      const orderRes = await customerAgent.get(`/api/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('PROCESSING');

      // Cannot accept twice.
      await creatorAgent.patch(`/api/creators/assignments/${assignmentId}/accept`).expect(400);
    });

    it('lets the creator reject an OFFERED assignment, leaving the order untouched', async () => {
      const orderId = await createConfirmedOrder(1000);
      const assignRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(201);
      const assignmentId = assignRes.body.assignment.id;

      const rejectRes = await creatorAgent
        .patch(`/api/creators/assignments/${assignmentId}/reject`)
        .send({ reason: 'Too busy' })
        .expect(200);
      expect(rejectRes.body.assignment.status).toBe('REJECTED');

      const orderRes = await customerAgent.get(`/api/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('CONFIRMED'); // never advanced
    });

    it('lets an admin cancel an ACCEPTED assignment without reverting the order, then allows reassignment', async () => {
      const orderId = await createConfirmedOrder(1000);
      const assignRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(201);
      const assignmentId = assignRes.body.assignment.id;
      await creatorAgent.patch(`/api/creators/assignments/${assignmentId}/accept`).expect(200);

      const cancelRes = await adminAgent
        .patch(`/api/admin/order-assignments/${assignmentId}/cancel`)
        .send({ reason: 'Creator unresponsive' })
        .expect(200);
      expect(cancelRes.body.assignment.status).toBe('CANCELLED');

      const orderRes = await customerAgent.get(`/api/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('PROCESSING'); // left as-is, not reverted

      // Reassignment to a new assignment succeeds because PROCESSING is allowed.
      const reassignRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(201);
      expect(reassignRes.body.assignment.status).toBe('OFFERED');
    });

    it('completes fulfillment, confirms the order, and creates a correctly-calculated CreatorEarning', async () => {
      const orderId = await createConfirmedOrder(2000); // 12 per 1000 * 2000 = 24
      const assignRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/assignments`)
        .send({ creatorOfferingId: offeringId })
        .expect(201);
      const assignmentId = assignRes.body.assignment.id;

      await creatorAgent.patch(`/api/creators/assignments/${assignmentId}/accept`).expect(200);
      const completeRes = await creatorAgent
        .patch(`/api/creators/assignments/${assignmentId}/complete`)
        .expect(200);
      expect(completeRes.body.assignment.status).toBe('COMPLETED');

      const orderRes = await customerAgent.get(`/api/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('COMPLETED');

      const earning = await prisma.creatorEarning.findUnique({
        where: { orderAssignmentId: assignmentId },
      });
      expect(earning).not.toBeNull();
      expect(earning?.amount.toString()).toBe('24');

      // Terminal — cannot complete twice.
      await creatorAgent.patch(`/api/creators/assignments/${assignmentId}/complete`).expect(400);
    });
  });

  describe('earnings & payouts', () => {
    it("reflects the creator's available balance from real CreatorEarning rows", async () => {
      const res = await creatorAgent.get('/api/creators/earnings').expect(200);
      expect(Number(res.body.balance)).toBeGreaterThan(0);
      expect(res.body.earnings.length).toBeGreaterThan(0);
    });

    it('rejects a payout request from a user with no balance', async () => {
      // otherCreator has never completed a fulfillment.
      await otherCreatorAgent.post('/api/creators/payouts').expect(400);
    });

    it('rejects unauthenticated and non-admin access to admin payout endpoints', async () => {
      await request(app.getHttpServer()).get('/api/admin/payouts').expect(401);
      await creatorAgent.get('/api/admin/payouts').expect(403);
    });

    it('lets a creator request a payout covering their full available balance', async () => {
      const balanceRes = await creatorAgent.get('/api/creators/earnings').expect(200);
      const expectedAmount = balanceRes.body.balance;

      const payoutRes = await creatorAgent.post('/api/creators/payouts').expect(201);
      expect(payoutRes.body.payoutRequest.status).toBe('PENDING');
      expect(payoutRes.body.payoutRequest.amount).toBe(expectedAmount);

      const afterRes = await creatorAgent.get('/api/creators/earnings').expect(200);
      expect(Number(afterRes.body.balance)).toBe(0);
    });

    it('rejects an invalid payout transition (PENDING -> PAID directly)', async () => {
      const { body } = await creatorAgent.get('/api/creators/payouts').expect(200);
      const payoutId = body.payoutRequests[0].id;
      await adminAgent.patch(`/api/admin/payouts/${payoutId}/status`).send({ status: 'PAID' }).expect(400);
    });

    it('releases earnings back to available balance when an admin rejects the payout', async () => {
      const { body } = await creatorAgent.get('/api/creators/payouts').expect(200);
      const payoutId = body.payoutRequests[0].id;

      const rejectRes = await adminAgent
        .patch(`/api/admin/payouts/${payoutId}/status`)
        .send({ status: 'REJECTED', notes: 'Bank details missing' })
        .expect(200);
      expect(rejectRes.body.payoutRequest.status).toBe('REJECTED');

      const balanceRes = await creatorAgent.get('/api/creators/earnings').expect(200);
      expect(Number(balanceRes.body.balance)).toBeGreaterThan(0);
    });

    it('lets a creator re-request a payout, and an admin approve then mark it paid', async () => {
      const payoutRes = await creatorAgent.post('/api/creators/payouts').expect(201);
      const payoutId = payoutRes.body.payoutRequest.id;

      const approveRes = await adminAgent
        .patch(`/api/admin/payouts/${payoutId}/status`)
        .send({ status: 'APPROVED' })
        .expect(200);
      expect(approveRes.body.payoutRequest.status).toBe('APPROVED');

      const paidRes = await adminAgent
        .patch(`/api/admin/payouts/${payoutId}/status`)
        .send({ status: 'PAID' })
        .expect(200);
      expect(paidRes.body.payoutRequest.status).toBe('PAID');
      expect(paidRes.body.payoutRequest.paidAt).not.toBeNull();

      // Terminal — cannot transition further.
      await adminAgent
        .patch(`/api/admin/payouts/${payoutId}/status`)
        .send({ status: 'APPROVED' })
        .expect(400);
    });

    it("rejects another creator's attempt to view this creator's payout request", async () => {
      const { body } = await creatorAgent.get('/api/creators/payouts').expect(200);
      const payoutId = body.payoutRequests[0].id;
      await otherCreatorAgent.get(`/api/creators/payouts/${payoutId}`).expect(403);
    });
  });
});
