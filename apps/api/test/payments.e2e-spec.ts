import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Payments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `pay-e2e-admin-${runId}@example.com`;
  const ownerEmail = `pay-e2e-owner-${runId}@example.com`;
  const otherEmail = `pay-e2e-other-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';
  const slug = `payment-test-service-${runId}`;

  let adminAgent: ReturnType<typeof request.agent>;
  let ownerAgent: ReturnType<typeof request.agent>;
  let otherAgent: ReturnType<typeof request.agent>;

  let serviceId: string;
  let ownerSocialAccountId: string;

  async function connectDevMockAccount(agent: ReturnType<typeof request.agent>, username: string) {
    const initiateRes = await agent.post('/api/social-accounts/DEV_MOCK/connect').expect(201);
    const completeRes = await agent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: initiateRes.body.state, mockUsername: username })
      .expect(201);
    return completeRes.body.account.id as string;
  }

  async function createPendingOrder(agent: ReturnType<typeof request.agent>, socialAccountId: string) {
    const res = await agent
      .post('/api/orders')
      .send({ serviceId, socialAccountId, quantity: 1000 })
      .expect(201);
    return res.body.order.id as string;
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
        displayName: 'Payments Admin',
        role: UserRole.ADMIN,
      },
    });
    adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/auth/login').send({ email: adminEmail, password }).expect(200);

    ownerAgent = request.agent(app.getHttpServer());
    await ownerAgent
      .post('/api/auth/register')
      .send({ email: ownerEmail, password, displayName: 'Payment Owner' })
      .expect(201);
    await ownerAgent.post('/api/auth/login').send({ email: ownerEmail, password }).expect(200);

    otherAgent = request.agent(app.getHttpServer());
    await otherAgent
      .post('/api/auth/register')
      .send({ email: otherEmail, password, displayName: 'Payment Other' })
      .expect(201);
    await otherAgent.post('/api/auth/login').send({ email: otherEmail, password }).expect(200);

    const serviceRes = await adminAgent
      .post('/api/admin/services')
      .send({
        name: 'Payment Test Service',
        slug,
        description: 'Service used for payment e2e tests.',
        category: 'FOLLOWERS',
        platform: 'DEV_MOCK',
        pricingModel: 'PER_THOUSAND',
        pricePerThousand: 20,
        minQuantity: 100,
        maxQuantity: 10000,
      })
      .expect(201);
    serviceId = serviceRes.body.service.id;

    ownerSocialAccountId = await connectDevMockAccount(ownerAgent, `pay_owner_${runId}`);
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({
      where: { user: { email: { in: [ownerEmail, otherEmail] } } },
    });
    await prisma.order.deleteMany({
      where: { user: { email: { in: [ownerEmail, otherEmail] } } },
    });
    await prisma.socialAccount.deleteMany({
      where: { user: { email: { in: [ownerEmail, otherEmail] } } },
    });
    await prisma.service.deleteMany({ where: { slug: { startsWith: `payment-test-service-${runId}` } } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, ownerEmail, otherEmail] } } });
    await app.close();
  });

  describe('initiating a payment', () => {
    it('rejects an unauthenticated request', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      await request(app.getHttpServer()).post(`/api/orders/${orderId}/payments`).expect(401);
    });

    it("rejects initiating a payment for another user's order", async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      await otherAgent.post(`/api/orders/${orderId}/payments`).expect(403);
    });

    it('rejects a nonexistent order', async () => {
      await ownerAgent
        .post('/api/orders/00000000-0000-0000-0000-000000000000/payments')
        .expect(404);
    });

    it('creates a PENDING payment snapshotting the order total, for a valid request', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const res = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      expect(res.body.payment.status).toBe('PENDING');
      expect(res.body.payment.provider).toBe('DEV_MOCK');
      expect(res.body.payment.amount).toBe('20'); // 20 per 1000 * 1000 units
      expect(res.body.redirectUrl).toContain(res.body.payment.id);
    });

    it('rejects initiating a second payment for an already-paid (non-PENDING) order', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      await ownerAgent
        .post('/api/payments/webhooks/DEV_MOCK')
        .send({ providerRef: initRes.body.payment.providerRef, outcome: 'SUCCEEDED' })
        .expect(201);

      // Order is now CONFIRMED, not PENDING.
      await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(400);
    });
  });

  describe('payment ownership', () => {
    it('lets the owner retrieve their own payment', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      const res = await ownerAgent.get(`/api/payments/${initRes.body.payment.id}`).expect(200);
      expect(res.body.payment.id).toBe(initRes.body.payment.id);
    });

    it("rejects another user's attempt to retrieve the payment", async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      await otherAgent.get(`/api/payments/${initRes.body.payment.id}`).expect(403);
    });

    it('lets the owner list payments for their own order', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      const res = await ownerAgent.get(`/api/orders/${orderId}/payments`).expect(200);
      expect(res.body.payments.length).toBeGreaterThan(0);
    });

    it("rejects another user's attempt to list payments for the order", async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      await otherAgent.get(`/api/orders/${orderId}/payments`).expect(403);
    });
  });

  describe('webhook', () => {
    it('confirms the order when the webhook reports success', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      const webhookRes = await request(app.getHttpServer())
        .post('/api/payments/webhooks/DEV_MOCK')
        .send({ providerRef: initRes.body.payment.providerRef, outcome: 'SUCCEEDED' })
        .expect(201);
      expect(webhookRes.body.status).toBe('SUCCEEDED');

      const paymentRes = await ownerAgent.get(`/api/payments/${initRes.body.payment.id}`).expect(200);
      expect(paymentRes.body.payment.status).toBe('SUCCEEDED');

      const orderRes = await ownerAgent.get(`/api/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('CONFIRMED');
    });

    it('leaves the order PENDING (retryable) when the webhook reports failure', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      await request(app.getHttpServer())
        .post('/api/payments/webhooks/DEV_MOCK')
        .send({ providerRef: initRes.body.payment.providerRef, outcome: 'FAILED' })
        .expect(201);

      const paymentRes = await ownerAgent.get(`/api/payments/${initRes.body.payment.id}`).expect(200);
      expect(paymentRes.body.payment.status).toBe('FAILED');

      const orderRes = await ownerAgent.get(`/api/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('PENDING');
    });

    it('is idempotent — a replayed webhook does not double-process', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      const payload = { providerRef: initRes.body.payment.providerRef, outcome: 'SUCCEEDED' };
      await request(app.getHttpServer()).post('/api/payments/webhooks/DEV_MOCK').send(payload).expect(201);
      // Second delivery of the same event must not error or re-trigger side effects.
      await request(app.getHttpServer()).post('/api/payments/webhooks/DEV_MOCK').send(payload).expect(201);

      const orderRes = await ownerAgent.get(`/api/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('CONFIRMED');
    });

    it('rejects a webhook for an unknown payment reference', async () => {
      await request(app.getHttpServer())
        .post('/api/payments/webhooks/DEV_MOCK')
        .send({ providerRef: 'dev-mock-pay-does-not-exist', outcome: 'SUCCEEDED' })
        .expect(404);
    });

    it('rejects a webhook for an unregistered/unknown provider', async () => {
      await request(app.getHttpServer())
        .post('/api/payments/webhooks/STRIPE')
        .send({ providerRef: 'irrelevant', outcome: 'SUCCEEDED' })
        .expect(400);
    });
  });

  describe('admin', () => {
    it('rejects unauthenticated access to admin payment endpoints', async () => {
      await request(app.getHttpServer()).get('/api/admin/payments').expect(401);
    });

    it('rejects a non-admin from admin payment endpoints', async () => {
      await ownerAgent.get('/api/admin/payments').expect(403);
    });

    it('lets an admin list and retrieve any payment', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      const listRes = await adminAgent.get('/api/admin/payments').expect(200);
      expect(
        listRes.body.payments.some((p: { id: string }) => p.id === initRes.body.payment.id),
      ).toBe(true);

      const getRes = await adminAgent.get(`/api/admin/payments/${initRes.body.payment.id}`).expect(200);
      expect(getRes.body.payment.id).toBe(initRes.body.payment.id);
    });
  });

  describe('refunds', () => {
    it('rejects refunding a PENDING (unpaid) payment', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      await adminAgent.post(`/api/admin/payments/${initRes.body.payment.id}/refund`).expect(400);
    });

    it('rejects a refund request from a non-admin', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      await ownerAgent.post(`/api/admin/payments/${initRes.body.payment.id}/refund`).expect(403);
    });

    it('lets an admin refund a SUCCEEDED payment, and rejects a second refund', async () => {
      const orderId = await createPendingOrder(ownerAgent, ownerSocialAccountId);
      const initRes = await ownerAgent.post(`/api/orders/${orderId}/payments`).expect(201);

      await request(app.getHttpServer())
        .post('/api/payments/webhooks/DEV_MOCK')
        .send({ providerRef: initRes.body.payment.providerRef, outcome: 'SUCCEEDED' })
        .expect(201);

      const refundRes = await adminAgent
        .post(`/api/admin/payments/${initRes.body.payment.id}/refund`)
        .send({ reason: 'Customer requested refund' })
        .expect(201);
      expect(refundRes.body.payment.status).toBe('REFUNDED');

      await adminAgent.post(`/api/admin/payments/${initRes.body.payment.id}/refund`).expect(400);
    });
  });
});
