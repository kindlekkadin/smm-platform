import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `ord-e2e-admin-${runId}@example.com`;
  const ownerEmail = `ord-e2e-owner-${runId}@example.com`;
  const otherEmail = `ord-e2e-other-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';
  const slug = `order-test-service-${runId}`;

  let adminAgent: ReturnType<typeof request.agent>;
  let ownerAgent: ReturnType<typeof request.agent>;
  let otherAgent: ReturnType<typeof request.agent>;

  let serviceId: string;
  let ownerSocialAccountId: string;
  let otherSocialAccountId: string;

  async function connectDevMockAccount(agent: ReturnType<typeof request.agent>, username: string) {
    const initiateRes = await agent.post('/api/social-accounts/DEV_MOCK/connect').expect(201);
    const completeRes = await agent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: initiateRes.body.state, mockUsername: username })
      .expect(201);
    return completeRes.body.account.id as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
        displayName: 'Orders Admin',
        role: UserRole.ADMIN,
      },
    });
    adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/auth/login').send({ email: adminEmail, password }).expect(200);

    ownerAgent = request.agent(app.getHttpServer());
    await ownerAgent
      .post('/api/auth/register')
      .send({ email: ownerEmail, password, displayName: 'Order Owner' })
      .expect(201);
    await ownerAgent.post('/api/auth/login').send({ email: ownerEmail, password }).expect(200);

    otherAgent = request.agent(app.getHttpServer());
    await otherAgent
      .post('/api/auth/register')
      .send({ email: otherEmail, password, displayName: 'Order Other' })
      .expect(201);
    await otherAgent.post('/api/auth/login').send({ email: otherEmail, password }).expect(200);

    const serviceRes = await adminAgent
      .post('/api/admin/services')
      .send({
        name: 'Order Test Service',
        slug,
        description: 'Service used for order e2e tests.',
        category: 'FOLLOWERS',
        platform: 'DEV_MOCK',
        pricePerThousand: 10,
        minQuantity: 100,
        maxQuantity: 10000,
      })
      .expect(201);
    serviceId = serviceRes.body.service.id;

    ownerSocialAccountId = await connectDevMockAccount(ownerAgent, `order_owner_${runId}`);
    otherSocialAccountId = await connectDevMockAccount(otherAgent, `order_other_${runId}`);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({
      where: { user: { email: { in: [ownerEmail, otherEmail] } } },
    });
    await prisma.socialAccount.deleteMany({
      where: { user: { email: { in: [ownerEmail, otherEmail] } } },
    });
    await prisma.service.deleteMany({ where: { slug: { startsWith: `order-test-service-${runId}` } } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, ownerEmail, otherEmail] } } });
    await app.close();
  });

  const validOrderPayload = () => ({
    serviceId,
    socialAccountId: ownerSocialAccountId,
    quantity: 1000,
  });

  describe('order creation', () => {
    it('rejects an unauthenticated create attempt', async () => {
      await request(app.getHttpServer()).post('/api/orders').send(validOrderPayload()).expect(401);
    });

    it('rejects a nonexistent service', async () => {
      await ownerAgent
        .post('/api/orders')
        .send({ ...validOrderPayload(), serviceId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('rejects an inactive service', async () => {
      await adminAgent.patch(`/api/admin/services/${serviceId}/deactivate`).expect(200);
      await ownerAgent.post('/api/orders').send(validOrderPayload()).expect(404);
      await adminAgent.patch(`/api/admin/services/${serviceId}/activate`).expect(200);
    });

    it("rejects using another user's social account", async () => {
      await ownerAgent
        .post('/api/orders')
        .send({ ...validOrderPayload(), socialAccountId: otherSocialAccountId })
        .expect(403);
    });

    it('rejects a disconnected social account', async () => {
      const tempId = await connectDevMockAccount(ownerAgent, `order_temp_${runId}`);
      await ownerAgent.delete(`/api/social-accounts/${tempId}`).expect(200);
      await ownerAgent
        .post('/api/orders')
        .send({ ...validOrderPayload(), socialAccountId: tempId })
        .expect(400);
    });

    it('rejects a quantity below the minimum', async () => {
      await ownerAgent.post('/api/orders').send({ ...validOrderPayload(), quantity: 1 }).expect(400);
    });

    it('rejects a quantity above the maximum', async () => {
      await ownerAgent
        .post('/api/orders')
        .send({ ...validOrderPayload(), quantity: 999999 })
        .expect(400);
    });

    it('rejects a client-supplied price/total (unknown field)', async () => {
      await ownerAgent
        .post('/api/orders')
        .send({ ...validOrderPayload(), totalPrice: 0.01 })
        .expect(400);
    });

    it('creates a PENDING order with a server-calculated total for a valid request', async () => {
      const res = await ownerAgent.post('/api/orders').send(validOrderPayload()).expect(201);
      expect(res.body.order.status).toBe('PENDING');
      expect(res.body.order.quantity).toBe(1000);
      expect(res.body.order.unitPricePerThousand).toBe('10');
      expect(res.body.order.totalPrice).toBe('10'); // 10 per 1000 * 1000 units = 10
      expect(res.body.order.service.id).toBe(serviceId);
      expect(res.body.order.socialAccount.id).toBe(ownerSocialAccountId);
    });
  });

  describe('ownership', () => {
    let orderId: string;

    beforeAll(async () => {
      const res = await ownerAgent.post('/api/orders').send(validOrderPayload()).expect(201);
      orderId = res.body.order.id;
    });

    it('lets the owner list their own orders', async () => {
      const res = await ownerAgent.get('/api/orders').expect(200);
      expect(res.body.orders.some((o: { id: string }) => o.id === orderId)).toBe(true);
    });

    it('lets the owner retrieve their own order', async () => {
      const res = await ownerAgent.get(`/api/orders/${orderId}`).expect(200);
      expect(res.body.order.id).toBe(orderId);
    });

    it("rejects another user's attempt to retrieve the order", async () => {
      await otherAgent.get(`/api/orders/${orderId}`).expect(403);
    });

    it("rejects another user's attempt to cancel the order", async () => {
      await otherAgent.post(`/api/orders/${orderId}/cancel`).expect(403);
    });

    it("does not leak the owner's orders into another user's list", async () => {
      const res = await otherAgent.get('/api/orders').expect(200);
      expect(res.body.orders.some((o: { id: string }) => o.id === orderId)).toBe(false);
    });
  });

  describe('cancellation', () => {
    it('lets the owner cancel a PENDING order', async () => {
      const createRes = await ownerAgent.post('/api/orders').send(validOrderPayload()).expect(201);
      const orderId = createRes.body.order.id;

      const cancelRes = await ownerAgent.post(`/api/orders/${orderId}/cancel`).expect(201);
      expect(cancelRes.body.order.status).toBe('CANCELLED');
    });

    it('rejects cancelling an order that is no longer PENDING', async () => {
      const createRes = await ownerAgent.post('/api/orders').send(validOrderPayload()).expect(201);
      const orderId = createRes.body.order.id;

      await adminAgent
        .patch(`/api/admin/orders/${orderId}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      await ownerAgent.post(`/api/orders/${orderId}/cancel`).expect(400);
    });
  });

  describe('admin', () => {
    let orderId: string;

    beforeAll(async () => {
      const res = await ownerAgent.post('/api/orders').send(validOrderPayload()).expect(201);
      orderId = res.body.order.id;
    });

    it('rejects unauthenticated access to admin order endpoints', async () => {
      await request(app.getHttpServer()).get('/api/admin/orders').expect(401);
    });

    it('rejects a non-admin (customer) from admin order endpoints', async () => {
      await ownerAgent.get('/api/admin/orders').expect(403);
      await ownerAgent.get(`/api/admin/orders/${orderId}`).expect(403);
      await ownerAgent
        .patch(`/api/admin/orders/${orderId}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(403);
    });

    it('lets an admin list and retrieve any order', async () => {
      const listRes = await adminAgent.get('/api/admin/orders').expect(200);
      expect(listRes.body.orders.some((o: { id: string }) => o.id === orderId)).toBe(true);

      const getRes = await adminAgent.get(`/api/admin/orders/${orderId}`).expect(200);
      expect(getRes.body.order.id).toBe(orderId);
    });

    it('rejects an invalid status transition', async () => {
      // PENDING -> COMPLETED is not a valid direct transition.
      await adminAgent
        .patch(`/api/admin/orders/${orderId}/status`)
        .send({ status: 'COMPLETED' })
        .expect(400);
    });

    it('allows a valid status transition chain', async () => {
      await adminAgent
        .patch(`/api/admin/orders/${orderId}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      await adminAgent
        .patch(`/api/admin/orders/${orderId}/status`)
        .send({ status: 'PROCESSING' })
        .expect(200);
      const res = await adminAgent
        .patch(`/api/admin/orders/${orderId}/status`)
        .send({ status: 'COMPLETED' })
        .expect(200);
      expect(res.body.order.status).toBe('COMPLETED');
    });

    it('rejects any transition out of a terminal state', async () => {
      await adminAgent
        .patch(`/api/admin/orders/${orderId}/status`)
        .send({ status: 'PENDING' })
        .expect(400);
    });
  });

  describe('pricing snapshot integrity', () => {
    it('freezes price on the order even after the service price changes', async () => {
      const firstRes = await ownerAgent.post('/api/orders').send(validOrderPayload()).expect(201);
      expect(firstRes.body.order.unitPricePerThousand).toBe('10');
      expect(firstRes.body.order.totalPrice).toBe('10');

      await adminAgent
        .patch(`/api/admin/services/${serviceId}`)
        .send({ pricePerThousand: 25 })
        .expect(200);

      // The existing order must be unaffected.
      const refetched = await ownerAgent.get(`/api/orders/${firstRes.body.order.id}`).expect(200);
      expect(refetched.body.order.unitPricePerThousand).toBe('10');
      expect(refetched.body.order.totalPrice).toBe('10');

      // A new order must use the new price.
      const secondRes = await ownerAgent.post('/api/orders').send(validOrderPayload()).expect(201);
      expect(secondRes.body.order.unitPricePerThousand).toBe('25');
      expect(secondRes.body.order.totalPrice).toBe('25');

      // Restore price for any subsequent tests in this file.
      await adminAgent
        .patch(`/api/admin/services/${serviceId}`)
        .send({ pricePerThousand: 10 })
        .expect(200);
    });
  });
});
