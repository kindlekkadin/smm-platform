import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Analytics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `an-e2e-admin-${runId}@example.com`;
  const creatorEmail = `an-e2e-creator-${runId}@example.com`;
  const customerEmail = `an-e2e-customer-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';
  const slugA = `analytics-service-a-${runId}`;
  const slugB = `analytics-service-b-${runId}`;

  let adminAgent: ReturnType<typeof request.agent>;
  let creatorAgent: ReturnType<typeof request.agent>;
  let customerAgent: ReturnType<typeof request.agent>;

  let serviceAId: string;
  let serviceBId: string;
  let socialAccountId: string;
  let providerId: string;
  let mappingId: string;

  const createdOrderIds: string[] = [];
  let orderAId: string; // Service A, dispatched to provider, COMPLETED
  let orderBId: string; // Service B, assigned to creator, COMPLETED
  let orderCId: string; // Service A, paid, unfulfilled
  let orderDId: string; // Service A, unpaid, unfulfilled

  async function connectDevMockAccount(agent: ReturnType<typeof request.agent>, username: string) {
    const initiateRes = await agent.post('/api/social-accounts/DEV_MOCK/connect').expect(201);
    const completeRes = await agent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: initiateRes.body.state, mockUsername: username })
      .expect(201);
    return completeRes.body.account.id as string;
  }

  async function createOrder(serviceId: string, quantity: number) {
    const orderRes = await customerAgent
      .post('/api/orders')
      .send({ serviceId, socialAccountId, quantity })
      .expect(201);
    const orderId = orderRes.body.order.id as string;
    createdOrderIds.push(orderId);
    return orderId;
  }

  async function payOrder(orderId: string) {
    const payRes = await customerAgent.post(`/api/orders/${orderId}/payments`).expect(201);
    await request(app.getHttpServer())
      .post('/api/payments/webhooks/DEV_MOCK')
      .send({ providerRef: payRes.body.payment.providerRef, outcome: 'SUCCEEDED' })
      .expect(201);
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
        displayName: 'AN Admin',
        role: UserRole.ADMIN,
      },
    });
    adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/auth/login').send({ email: adminEmail, password }).expect(200);

    creatorAgent = request.agent(app.getHttpServer());
    await creatorAgent
      .post('/api/auth/register')
      .send({ email: creatorEmail, password, displayName: 'AN Creator', role: 'CREATOR' })
      .expect(201);
    await creatorAgent.post('/api/auth/login').send({ email: creatorEmail, password }).expect(200);

    customerAgent = request.agent(app.getHttpServer());
    await customerAgent
      .post('/api/auth/register')
      .send({ email: customerEmail, password, displayName: 'AN Customer' })
      .expect(201);
    await customerAgent.post('/api/auth/login').send({ email: customerEmail, password }).expect(200);

    // Service A: DEV_MOCK platform, price 10/1000 -> fulfilled via provider.
    const serviceARes = await adminAgent
      .post('/api/admin/services')
      .send({
        name: 'Analytics Service A',
        slug: slugA,
        description: 'Provider-fulfilled service for analytics e2e.',
        category: 'FOLLOWERS',
        platform: 'DEV_MOCK',
        pricingModel: 'PER_THOUSAND',
        pricePerThousand: 10,
        minQuantity: 100,
        maxQuantity: 100000,
      })
      .expect(201);
    serviceAId = serviceARes.body.service.id;

    // Service B: INSTAGRAM platform, price 20/1000 -> fulfilled via creator.
    const serviceBRes = await adminAgent
      .post('/api/admin/services')
      .send({
        name: 'Analytics Service B',
        slug: slugB,
        description: 'Creator-fulfilled service for analytics e2e.',
        category: 'LIKES',
        platform: 'INSTAGRAM',
        pricingModel: 'PER_THOUSAND',
        pricePerThousand: 20,
        minQuantity: 100,
        maxQuantity: 100000,
      })
      .expect(201);
    serviceBId = serviceBRes.body.service.id;

    socialAccountId = await connectDevMockAccount(customerAgent, `an_customer_${runId}`);

    // ---- Creator channel setup: apply, approve, offer, approve ----
    const applyRes = await creatorAgent.post('/api/creators/apply').send({ bio: 'Analytics e2e creator' }).expect(201);
    const creatorProfileId = applyRes.body.profile.id as string;
    await adminAgent.patch(`/api/admin/creators/${creatorProfileId}/status`).send({ status: 'APPROVED' }).expect(200);

    const offeringRes = await creatorAgent
      .post('/api/creators/offerings')
      .send({ serviceId: serviceBId, creatorPricePerThousand: 12, minQuantity: 100, maxQuantity: 100000 })
      .expect(201);
    const offeringId = offeringRes.body.offering.id as string;
    await adminAgent.patch(`/api/admin/creator-offerings/${offeringId}/status`).send({ status: 'APPROVED' }).expect(200);

    // ---- Provider channel setup: reuse the singleton DEV_MOCK provider ----
    const existingProvider = await prisma.provider.findUnique({ where: { code: 'DEV_MOCK' } });
    providerId = existingProvider
      ? existingProvider.id
      : (
          await prisma.provider.create({
            data: { name: 'Dev Mock Provider', code: 'DEV_MOCK', isActive: true },
          })
        ).id;

    const mappingRes = await adminAgent
      .post('/api/admin/provider-mappings')
      .send({ providerId, serviceId: serviceAId, providerServiceId: 'ext-analytics-e2e', providerPricePerThousand: 6 })
      .expect(201);
    mappingId = mappingRes.body.mapping.id;

    // ---- Order A: Service A, paid, dispatched to provider, COMPLETED ----
    orderAId = await createOrder(serviceAId, 1000);
    await payOrder(orderAId);
    const dispatchRes = await adminAgent
      .post(`/api/admin/orders/${orderAId}/provider-dispatch`)
      .send({ providerServiceMappingId: mappingId })
      .expect(201);
    const providerOrderRef = dispatchRes.body.submission.providerOrderRef as string;
    await request(app.getHttpServer())
      .post('/api/providers/webhooks/DEV_MOCK')
      .send({ providerOrderRef, outcome: 'COMPLETED' })
      .expect(201);

    // ---- Order B: Service B, paid, assigned to creator, COMPLETED ----
    orderBId = await createOrder(serviceBId, 1000);
    await payOrder(orderBId);
    const assignRes = await adminAgent
      .post(`/api/admin/orders/${orderBId}/assignments`)
      .send({ creatorOfferingId: offeringId })
      .expect(201);
    const assignmentId = assignRes.body.assignment.id as string;
    await creatorAgent.patch(`/api/creators/assignments/${assignmentId}/accept`).expect(200);
    await creatorAgent.patch(`/api/creators/assignments/${assignmentId}/complete`).expect(200);

    // ---- Order C: Service A, paid, left unfulfilled ----
    orderCId = await createOrder(serviceAId, 1000);
    await payOrder(orderCId);

    // ---- Order D: Service A, never paid, left unfulfilled ----
    orderDId = await createOrder(serviceAId, 1000);
  });

  afterAll(async () => {
    await prisma.providerOrderSubmission.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.providerServiceMapping.deleteMany({ where: { id: mappingId } });
    await prisma.creatorEarning.deleteMany({ where: { creatorProfile: { user: { email: creatorEmail } } } });
    await prisma.orderAssignment.deleteMany({ where: { creatorProfile: { user: { email: creatorEmail } } } });
    await prisma.creatorOffering.deleteMany({ where: { creatorProfile: { user: { email: creatorEmail } } } });
    await prisma.creatorProfile.deleteMany({ where: { user: { email: creatorEmail } } });
    await prisma.payment.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.order.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.socialAccount.deleteMany({ where: { user: { email: customerEmail } } });
    await prisma.service.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, creatorEmail, customerEmail] } } });
    await app.close();
  });

  describe('guards', () => {
    it('rejects unauthenticated access', async () => {
      await request(app.getHttpServer()).get('/api/admin/analytics/overview').expect(401);
    });

    it('rejects non-admin access', async () => {
      await customerAgent.get('/api/admin/analytics/overview').expect(403);
      await creatorAgent.get('/api/admin/analytics/breakdowns').expect(403);
      await customerAgent.get('/api/admin/analytics/orders').expect(403);
    });
  });

  describe('overview', () => {
    it('aggregates gross revenue, fulfillment cost, and margin across all four orders', async () => {
      const res = await adminAgent.get('/api/admin/analytics/overview').expect(200);
      const body = res.body;

      expect(body.orderCount).toBeGreaterThanOrEqual(4);
      expect(body.fulfillmentStatus).toBe('REPORTED');
      expect(body.isVerified).toBe(false);

      // Scope precisely with the serviceId filter instead of asserting exact
      // totals against a DB that other suites may also be writing to.
    });

    it('scoped to Service A: revenue 20 (A+C paid, D unpaid), cost 6 (provider), fulfilled 1 of 3', async () => {
      const res = await adminAgent.get(`/api/admin/analytics/overview?serviceId=${serviceAId}`).expect(200);
      expect(res.body.orderCount).toBe(3);
      expect(res.body.fulfilledOrderCount).toBe(1);
      expect(res.body.grossRevenue).toBe('20');
      expect(res.body.fulfillmentCost).toBe('6');
      expect(res.body.netMargin).toBe('14');
      expect(res.body.marginPercent).toBe(70);
    });

    it('scoped to Service B: revenue 20, cost 12 (creator), fulfilled 1 of 1', async () => {
      const res = await adminAgent.get(`/api/admin/analytics/overview?serviceId=${serviceBId}`).expect(200);
      expect(res.body.orderCount).toBe(1);
      expect(res.body.fulfilledOrderCount).toBe(1);
      expect(res.body.grossRevenue).toBe('20');
      expect(res.body.fulfillmentCost).toBe('12');
      expect(res.body.netMargin).toBe('8');
      expect(res.body.marginPercent).toBe(40);
    });

    it('scoped to INSTAGRAM platform matches Service B totals', async () => {
      const res = await adminAgent.get('/api/admin/analytics/overview?platform=INSTAGRAM').expect(200);
      expect(res.body.orderCount).toBe(1);
      expect(res.body.grossRevenue).toBe('20');
    });

    it('returns 0%, not NaN/Infinity, for a date window with no orders', async () => {
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const res = await adminAgent.get(`/api/admin/analytics/overview?dateFrom=${farFuture}`).expect(200);
      expect(res.body.orderCount).toBe(0);
      expect(res.body.grossRevenue).toBe('0');
      expect(res.body.marginPercent).toBe(0);
    });

    it('rejects an invalid platform filter', async () => {
      await adminAgent.get('/api/admin/analytics/overview?platform=NOT_A_PLATFORM').expect(400);
    });
  });

  describe('breakdowns', () => {
    it('groups Service A orders by channel: PROVIDER 1, UNFULFILLED 2', async () => {
      const res = await adminAgent.get(`/api/admin/analytics/breakdowns?serviceId=${serviceAId}`).expect(200);
      const byChannel: Array<{ key: string; orderCount: number; revenue: string; cost: string }> = res.body.byChannel;

      const provider = byChannel.find((g) => g.key === 'PROVIDER');
      expect(provider?.orderCount).toBe(1);
      expect(provider?.revenue).toBe('10');
      expect(provider?.cost).toBe('6');

      const unfulfilled = byChannel.find((g) => g.key === 'UNFULFILLED');
      expect(unfulfilled?.orderCount).toBe(2);
      expect(unfulfilled?.revenue).toBe('10'); // C paid (10), D unpaid (0)
      expect(unfulfilled?.cost).toBe('0');

      expect(byChannel.find((g) => g.key === 'CREATOR')).toBeUndefined();
    });

    it('groups by service and by platform', async () => {
      const res = await adminAgent.get('/api/admin/analytics/breakdowns').expect(200);
      const byService: Array<{ key: string; orderCount: number }> = res.body.byService;
      const byPlatform: Array<{ key: string; orderCount: number }> = res.body.byPlatform;

      const serviceAGroup = byService.find((g) => g.key === 'Analytics Service A');
      expect(serviceAGroup?.orderCount).toBe(3);
      const serviceBGroup = byService.find((g) => g.key === 'Analytics Service B');
      expect(serviceBGroup?.orderCount).toBe(1);

      const instagramGroup = byPlatform.find((g) => g.key === 'INSTAGRAM');
      expect(instagramGroup?.orderCount).toBe(1);
    });
  });

  describe('order line items', () => {
    it('labels a provider-completed order as REPORTED, unverified', async () => {
      const res = await adminAgent.get(`/api/admin/analytics/orders?serviceId=${serviceAId}&pageSize=100`).expect(200);
      const orderA = res.body.orders.find((o: { orderId: string }) => o.orderId === orderAId);

      expect(orderA.channel).toBe('PROVIDER');
      expect(orderA.fulfillmentStatus).toBe('REPORTED');
      expect(orderA.isVerified).toBe(false);
      expect(orderA.revenue).toBe('10');
      expect(orderA.cost).toBe('6');
      expect(orderA.margin).toBe('4');
    });

    it('labels an unfulfilled order as NONE, unverified', async () => {
      const res = await adminAgent.get(`/api/admin/analytics/orders?serviceId=${serviceAId}&pageSize=100`).expect(200);
      const orderC = res.body.orders.find((o: { orderId: string }) => o.orderId === orderCId);

      expect(orderC.channel).toBe('UNFULFILLED');
      expect(orderC.fulfillmentStatus).toBe('NONE');
      expect(orderC.isVerified).toBe(false);
    });

    it('paginates results and reports the correct total', async () => {
      const res = await adminAgent
        .get(`/api/admin/analytics/orders?serviceId=${serviceAId}&page=1&pageSize=2`)
        .expect(200);
      expect(res.body.orders).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(2);

      const page2 = await adminAgent
        .get(`/api/admin/analytics/orders?serviceId=${serviceAId}&page=2&pageSize=2`)
        .expect(200);
      expect(page2.body.orders).toHaveLength(1);
    });
  });
});
