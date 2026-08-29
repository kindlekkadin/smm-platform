import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Services (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `svc-e2e-admin-${runId}@example.com`;
  const customerEmail = `svc-e2e-customer-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';
  const slug = `instagram-followers-${runId}`;

  let adminAgent: ReturnType<typeof request.agent>;
  let customerAgent: ReturnType<typeof request.agent>;

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
        displayName: 'Services Admin',
        role: UserRole.ADMIN,
      },
    });

    adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/auth/login').send({ email: adminEmail, password }).expect(200);

    customerAgent = request.agent(app.getHttpServer());
    await customerAgent
      .post('/api/auth/register')
      .send({ email: customerEmail, password, displayName: 'Services Customer' })
      .expect(201);
    await customerAgent.post('/api/auth/login').send({ email: customerEmail, password }).expect(200);
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { slug: { startsWith: `instagram-followers-${runId}` } } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, customerEmail] } } });
    await app.close();
  });

  const basePayload = () => ({
    name: 'Instagram Followers',
    slug,
    description: 'High quality Instagram followers.',
    category: 'FOLLOWERS',
    platform: 'INSTAGRAM',
    pricePerThousand: 10,
    minQuantity: 100,
    maxQuantity: 10000,
  });

  let createdId: string;

  describe('admin service management', () => {
    it('rejects unauthenticated create', async () => {
      await request(app.getHttpServer()).post('/api/admin/services').send(basePayload()).expect(401);
    });

    it('rejects a non-admin (customer) create', async () => {
      await customerAgent.post('/api/admin/services').send(basePayload()).expect(403);
    });

    it('lets an admin create a service', async () => {
      const res = await adminAgent.post('/api/admin/services').send(basePayload()).expect(201);
      expect(res.body.service.slug).toBe(slug);
      expect(res.body.service.active).toBe(true);
      createdId = res.body.service.id;
    });

    it('rejects a duplicate slug', async () => {
      await adminAgent.post('/api/admin/services').send(basePayload()).expect(409);
    });

    it('rejects minQuantity greater than maxQuantity', async () => {
      await adminAgent
        .post('/api/admin/services')
        .send({ ...basePayload(), slug: `${slug}-bad-range`, minQuantity: 500, maxQuantity: 100 })
        .expect(400);
    });

    it('rejects a negative price', async () => {
      await adminAgent
        .post('/api/admin/services')
        .send({ ...basePayload(), slug: `${slug}-bad-price`, pricePerThousand: -5 })
        .expect(400);
    });

    it('lets an admin update a service', async () => {
      const res = await adminAgent
        .patch(`/api/admin/services/${createdId}`)
        .send({ name: 'Instagram Followers (Updated)', pricePerThousand: 12.5 })
        .expect(200);
      expect(res.body.service.name).toBe('Instagram Followers (Updated)');
      expect(res.body.service.pricePerThousand).toBe('12.5');
    });

    it('rejects a non-admin update', async () => {
      await customerAgent
        .patch(`/api/admin/services/${createdId}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('lets an admin deactivate and reactivate a service', async () => {
      const deactivated = await adminAgent
        .patch(`/api/admin/services/${createdId}/deactivate`)
        .expect(200);
      expect(deactivated.body.service.active).toBe(false);

      const reactivated = await adminAgent
        .patch(`/api/admin/services/${createdId}/activate`)
        .expect(200);
      expect(reactivated.body.service.active).toBe(true);
    });
  });

  describe('customer catalog', () => {
    it('returns active services to an unauthenticated visitor', async () => {
      const res = await request(app.getHttpServer()).get('/api/services').expect(200);
      expect(res.body.services.some((s: { id: string }) => s.id === createdId)).toBe(true);
    });

    it('hides inactive services from the catalog', async () => {
      await adminAgent.patch(`/api/admin/services/${createdId}/deactivate`).expect(200);

      const listRes = await request(app.getHttpServer()).get('/api/services').expect(200);
      expect(listRes.body.services.some((s: { id: string }) => s.id === createdId)).toBe(false);

      const getRes = await request(app.getHttpServer()).get(`/api/services/${createdId}`);
      expect(getRes.status).toBe(404);

      // Reactivate for subsequent tests.
      await adminAgent.patch(`/api/admin/services/${createdId}/activate`).expect(200);
    });

    it('retrieves a single active service', async () => {
      const res = await request(app.getHttpServer()).get(`/api/services/${createdId}`).expect(200);
      expect(res.body.service.id).toBe(createdId);
    });

    it('returns 404 for an unknown service id', async () => {
      await request(app.getHttpServer())
        .get('/api/services/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('filters by platform', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/services')
        .query({ platform: 'INSTAGRAM' })
        .expect(200);
      expect(res.body.services.some((s: { id: string }) => s.id === createdId)).toBe(true);

      const noneRes = await request(app.getHttpServer())
        .get('/api/services')
        .query({ platform: 'YOUTUBE' })
        .expect(200);
      expect(noneRes.body.services.some((s: { id: string }) => s.id === createdId)).toBe(false);
    });

    it('filters by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/services')
        .query({ category: 'FOLLOWERS' })
        .expect(200);
      expect(res.body.services.some((s: { id: string }) => s.id === createdId)).toBe(true);

      const noneRes = await request(app.getHttpServer())
        .get('/api/services')
        .query({ category: 'LIKES' })
        .expect(200);
      expect(noneRes.body.services.some((s: { id: string }) => s.id === createdId)).toBe(false);
    });

    it('rejects modification attempts from a customer', async () => {
      await customerAgent.patch(`/api/admin/services/${createdId}/deactivate`).expect(403);
    });
  });

  describe('pricing estimate', () => {
    it('returns a correct estimate for a valid quantity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/services/${createdId}/estimate`)
        .query({ quantity: 1000 })
        .expect(200);
      // Price was updated to 12.5 per thousand above.
      expect(res.body.estimatedPrice).toBe('12.5');
    });

    it('rejects a quantity below the minimum', async () => {
      await request(app.getHttpServer())
        .get(`/api/services/${createdId}/estimate`)
        .query({ quantity: 1 })
        .expect(400);
    });

    it('rejects a quantity above the maximum', async () => {
      await request(app.getHttpServer())
        .get(`/api/services/${createdId}/estimate`)
        .query({ quantity: 999999 })
        .expect(400);
    });

    it('rejects a non-numeric quantity', async () => {
      await request(app.getHttpServer())
        .get(`/api/services/${createdId}/estimate`)
        .query({ quantity: 'abc' })
        .expect(400);
    });
  });
});
