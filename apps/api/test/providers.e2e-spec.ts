import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Providers / Fulfillment (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `pv-e2e-admin-${runId}@example.com`;
  const customerEmail = `pv-e2e-customer-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';
  const slug = `provider-fulfillment-service-${runId}`;
  const otherSlug = `provider-fulfillment-other-service-${runId}`;

  let adminAgent: ReturnType<typeof request.agent>;
  let customerAgent: ReturnType<typeof request.agent>;

  let serviceId: string;
  let otherServiceId: string;
  let socialAccountId: string;
  let providerId: string;
  let mappingId: string;

  const createdOrderIds: string[] = [];

  async function connectDevMockAccount(agent: ReturnType<typeof request.agent>, username: string) {
    const initiateRes = await agent.post('/api/social-accounts/DEV_MOCK/connect').expect(201);
    const completeRes = await agent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: initiateRes.body.state, mockUsername: username })
      .expect(201);
    return completeRes.body.account.id as string;
  }

  /** Creates a CONFIRMED order (created + paid) ready for provider dispatch. */
  async function createConfirmedOrder(targetServiceId: string, quantity: number) {
    const orderRes = await customerAgent
      .post('/api/orders')
      .send({ serviceId: targetServiceId, socialAccountId, quantity })
      .expect(201);
    const orderId = orderRes.body.order.id as string;
    createdOrderIds.push(orderId);

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
        displayName: 'PV Admin',
        role: UserRole.ADMIN,
      },
    });
    adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/auth/login').send({ email: adminEmail, password }).expect(200);

    customerAgent = request.agent(app.getHttpServer());
    await customerAgent
      .post('/api/auth/register')
      .send({ email: customerEmail, password, displayName: 'PV Customer' })
      .expect(201);
    await customerAgent.post('/api/auth/login').send({ email: customerEmail, password }).expect(200);

    const serviceRes = await adminAgent
      .post('/api/admin/services')
      .send({
        name: 'Provider Fulfillment Service',
        slug,
        description: 'Service used for provider fulfillment e2e tests.',
        category: 'FOLLOWERS',
        platform: 'DEV_MOCK',
        pricingModel: 'PER_THOUSAND',
        pricePerThousand: 15,
        minQuantity: 100,
        maxQuantity: 100000,
      })
      .expect(201);
    serviceId = serviceRes.body.service.id;

    const otherServiceRes = await adminAgent
      .post('/api/admin/services')
      .send({
        name: 'Provider Fulfillment Other Service',
        slug: otherSlug,
        description: 'Second, unmapped service for mismatch tests.',
        category: 'LIKES',
        platform: 'DEV_MOCK',
        pricingModel: 'PER_THOUSAND',
        pricePerThousand: 10,
        minQuantity: 100,
        maxQuantity: 100000,
      })
      .expect(201);
    otherServiceId = otherServiceRes.body.service.id;

    socialAccountId = await connectDevMockAccount(customerAgent, `pv_customer_${runId}`);

    // DEV_MOCK is a singleton adapter (unique Provider.code) — reuse if a
    // prior run left it behind rather than colliding on the unique code.
    const existing = await prisma.provider.findUnique({ where: { code: 'DEV_MOCK' } });
    providerId = existing
      ? existing.id
      : (
          await prisma.provider.create({
            data: { name: 'Dev Mock Provider', code: 'DEV_MOCK', isActive: true },
          })
        ).id;

    const mappingRes = await adminAgent
      .post('/api/admin/provider-mappings')
      .send({ providerId, serviceId, providerServiceId: 'ext-service-1' })
      .expect(201);
    mappingId = mappingRes.body.mapping.id;
  });

  afterAll(async () => {
    await prisma.providerOrderSubmission.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.providerServiceMapping.deleteMany({ where: { id: mappingId } });
    await prisma.payment.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.order.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.socialAccount.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.service.deleteMany({ where: { slug: { in: [slug, otherSlug] } } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, customerEmail] } } });
    await app.close();
  });

  describe('admin provider CRUD', () => {
    it('rejects unauthenticated access', async () => {
      await request(app.getHttpServer()).get('/api/admin/providers').expect(401);
    });

    it('rejects non-admin access', async () => {
      await customerAgent.get('/api/admin/providers').expect(403);
    });

    it('lists providers without ever exposing the encrypted api key', async () => {
      const res = await adminAgent.get('/api/admin/providers').expect(200);
      const devMock = res.body.providers.find((p: { id: string }) => p.id === providerId);
      expect(devMock).toBeDefined();
      expect(devMock.apiKeySecret).toBeUndefined();
      expect(typeof devMock.hasApiKey).toBe('boolean');
    });

    it('creates a provider with an encrypted api key and reports hasApiKey', async () => {
      const res = await adminAgent
        .post('/api/admin/providers')
        .send({ name: 'Temp Provider', code: `TEMP_${runId}`, apiKey: 'super-secret-key' })
        .expect(201);
      expect(res.body.provider.hasApiKey).toBe(true);
      expect(res.body.provider.apiKeySecret).toBeUndefined();

      await prisma.provider.delete({ where: { id: res.body.provider.id } });
    });

    it('rejects a duplicate provider code', async () => {
      await adminAgent
        .post('/api/admin/providers')
        .send({ name: 'Dup', code: 'DEV_MOCK' })
        .expect(409);
    });

    it('updates a provider', async () => {
      const res = await adminAgent
        .patch(`/api/admin/providers/${providerId}`)
        .send({ name: 'Dev Mock Provider (updated)' })
        .expect(200);
      expect(res.body.provider.name).toBe('Dev Mock Provider (updated)');
    });
  });

  describe('admin provider service mapping CRUD', () => {
    it('rejects a mapping for a nonexistent service', async () => {
      await adminAgent
        .post('/api/admin/provider-mappings')
        .send({ providerId, serviceId: '00000000-0000-0000-0000-000000000000', providerServiceId: 'x' })
        .expect(404);
    });

    it('rejects a duplicate mapping for the same provider+service', async () => {
      await adminAgent
        .post('/api/admin/provider-mappings')
        .send({ providerId, serviceId, providerServiceId: 'ext-service-1-dup' })
        .expect(409);
    });

    it('lists mappings, optionally filtered by provider', async () => {
      const res = await adminAgent.get(`/api/admin/provider-mappings?providerId=${providerId}`).expect(200);
      expect(res.body.mappings.some((m: { id: string }) => m.id === mappingId)).toBe(true);
    });

    it('rejects minQuantity greater than maxQuantity on update', async () => {
      await adminAgent
        .patch(`/api/admin/provider-mappings/${mappingId}`)
        .send({ minQuantity: 5000, maxQuantity: 100 })
        .expect(400);
    });
  });

  describe('dispatch pipeline', () => {
    it('rejects dispatch for an order that has not been paid', async () => {
      const orderRes = await customerAgent
        .post('/api/orders')
        .send({ serviceId, socialAccountId, quantity: 1000 })
        .expect(201);
      createdOrderIds.push(orderRes.body.order.id);

      await adminAgent
        .post(`/api/admin/orders/${orderRes.body.order.id}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(400);
    });

    it('rejects dispatch when the mapping is for a different service', async () => {
      const orderId = await createConfirmedOrder(otherServiceId, 1000);
      await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(400);
    });

    it('dispatches a confirmed order, advancing it to PROCESSING', async () => {
      const orderId = await createConfirmedOrder(serviceId, 1000);

      const res = await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(201);
      expect(res.body.submission.status).toBe('SUBMITTED');
      expect(res.body.submission.providerOrderRef).toMatch(/^dev-mock-order-/);

      const orderRes = await adminAgent.get(`/api/admin/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('PROCESSING');
    });

    it('rejects a second dispatch while an active submission exists', async () => {
      const orderId = await createConfirmedOrder(serviceId, 1000);
      await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(201);

      await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(400);
    });

    it('never completes a submission from dispatch alone — polling stays inert until an explicit signal', async () => {
      const orderId = await createConfirmedOrder(serviceId, 1000);
      const dispatchRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(201);
      const submissionId = dispatchRes.body.submission.id as string;

      const pollRes = await adminAgent.post(`/api/admin/provider-submissions/${submissionId}/poll`).expect(201);
      expect(pollRes.body.submission.status).toBe('IN_PROGRESS');
      expect(pollRes.body.submission.externalStatus).toBe('queued');

      const orderRes = await adminAgent.get(`/api/admin/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('PROCESSING');
    });

    it('completes an order only via an explicit webhook signal, and is idempotent on replay', async () => {
      const orderId = await createConfirmedOrder(serviceId, 1000);
      const dispatchRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(201);
      const providerOrderRef = dispatchRes.body.submission.providerOrderRef as string;

      const webhookRes = await request(app.getHttpServer())
        .post('/api/providers/webhooks/DEV_MOCK')
        .send({ providerOrderRef, outcome: 'COMPLETED' })
        .expect(201);
      expect(webhookRes.body.status).toBe('COMPLETED');

      const orderRes = await adminAgent.get(`/api/admin/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('COMPLETED');

      // Replay must not error or double-process.
      const replayRes = await request(app.getHttpServer())
        .post('/api/providers/webhooks/DEV_MOCK')
        .send({ providerOrderRef, outcome: 'COMPLETED' })
        .expect(201);
      expect(replayRes.body.status).toBe('COMPLETED');
    });

    it('handles failure via webhook and allows a retry that resubmits', async () => {
      const orderId = await createConfirmedOrder(serviceId, 1000);
      const dispatchRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(201);
      const submissionId = dispatchRes.body.submission.id as string;
      const firstRef = dispatchRes.body.submission.providerOrderRef as string;

      await request(app.getHttpServer())
        .post('/api/providers/webhooks/DEV_MOCK')
        .send({ providerOrderRef: firstRef, outcome: 'FAILED' })
        .expect(201);

      const failedRes = await adminAgent.get(`/api/admin/provider-submissions/${submissionId}`).expect(200);
      expect(failedRes.body.submission.status).toBe('FAILED');

      const retryRes = await adminAgent
        .post(`/api/admin/provider-submissions/${submissionId}/retry`)
        .expect(201);
      expect(retryRes.body.submission.status).toBe('SUBMITTED');
      expect(retryRes.body.submission.attempts).toBe(2);
      expect(retryRes.body.submission.providerOrderRef).not.toBe(firstRef);

      // Failure never regresses the order — it stayed PROCESSING throughout.
      const orderRes = await adminAgent.get(`/api/admin/orders/${orderId}`).expect(200);
      expect(orderRes.body.order.status).toBe('PROCESSING');
    });

    it('cancels an active submission and blocks further polling or cancellation', async () => {
      const orderId = await createConfirmedOrder(serviceId, 1000);
      const dispatchRes = await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: mappingId })
        .expect(201);
      const submissionId = dispatchRes.body.submission.id as string;

      const cancelRes = await adminAgent
        .post(`/api/admin/provider-submissions/${submissionId}/cancel`)
        .send({ reason: 'customer requested cancellation' })
        .expect(201);
      expect(cancelRes.body.submission.status).toBe('CANCELLED');

      await adminAgent.post(`/api/admin/provider-submissions/${submissionId}/poll`).expect(400);
      await adminAgent.post(`/api/admin/provider-submissions/${submissionId}/cancel`).expect(400);
    });

    it('enforces the mapping quantity range', async () => {
      const narrowMapping = await adminAgent
        .post('/api/admin/provider-mappings')
        .send({
          providerId,
          serviceId: otherServiceId,
          providerServiceId: 'ext-service-narrow',
          minQuantity: 5000,
          maxQuantity: 10000,
        })
        .expect(201);

      const orderId = await createConfirmedOrder(otherServiceId, 200);
      await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: narrowMapping.body.mapping.id })
        .expect(400);

      await prisma.providerServiceMapping.delete({ where: { id: narrowMapping.body.mapping.id } });
    });

    it('rejects dispatch when the mapping is inactive', async () => {
      const inactiveMapping = await adminAgent
        .post('/api/admin/provider-mappings')
        .send({ providerId, serviceId: otherServiceId, providerServiceId: 'ext-service-inactive', active: false })
        .expect(201);

      const orderId = await createConfirmedOrder(otherServiceId, 1000);
      await adminAgent
        .post(`/api/admin/orders/${orderId}/provider-dispatch`)
        .send({ providerServiceMappingId: inactiveMapping.body.mapping.id })
        .expect(400);

      await prisma.providerServiceMapping.delete({ where: { id: inactiveMapping.body.mapping.id } });
    });
  });

  describe('webhook validation', () => {
    it('rejects a webhook for an unknown provider order reference', async () => {
      await request(app.getHttpServer())
        .post('/api/providers/webhooks/DEV_MOCK')
        .send({ providerOrderRef: 'dev-mock-order-does-not-exist', outcome: 'COMPLETED' })
        .expect(404);
    });

    it('rejects a webhook with an invalid outcome', async () => {
      await request(app.getHttpServer())
        .post('/api/providers/webhooks/DEV_MOCK')
        .send({ providerOrderRef: 'irrelevant', outcome: 'MAYBE' })
        .expect(400);
    });

    it('rejects a webhook for an unregistered provider code', async () => {
      await request(app.getHttpServer())
        .post('/api/providers/webhooks/NOT_A_REAL_PROVIDER')
        .send({ providerOrderRef: 'irrelevant', outcome: 'COMPLETED' })
        .expect(501);
    });
  });
});
