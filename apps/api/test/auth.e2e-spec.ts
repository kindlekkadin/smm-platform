import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const customerEmail = `auth-e2e-customer-${runId}@example.com`;
  const adminEmail = `auth-e2e-admin-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';

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

    // Seed an admin directly (public registration cannot create admins).
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(password, 10),
        displayName: 'Test Admin',
        role: UserRole.ADMIN,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [customerEmail, adminEmail] } } });
    await app.close();
  });

  it('registers a new user without exposing the password hash', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: customerEmail, password, displayName: 'Test Customer' })
      .expect(201);

    expect(res.body.user.email).toBe(customerEmail);
    expect(res.body.user.role).toBe(UserRole.CUSTOMER);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate registration', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: customerEmail, password, displayName: 'Test Customer' })
      .expect(409);
  });

  it('rejects login with an unknown email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password })
      .expect(401);
  });

  it('rejects login with a wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: customerEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects the protected endpoint with no authentication', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('logs in and reaches the protected endpoint with the issued cookie', async () => {
    const agent = request.agent(app.getHttpServer());

    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: customerEmail, password })
      .expect(200);

    expect(loginRes.body.user.email).toBe(customerEmail);
    expect(loginRes.headers['set-cookie']).toBeDefined();

    const meRes = await agent.get('/api/auth/me').expect(200);
    expect(meRes.body.user.email).toBe(customerEmail);
  });

  it('enforces role authorization on a role-guarded endpoint', async () => {
    const customerAgent = request.agent(app.getHttpServer());
    await customerAgent.post('/api/auth/login').send({ email: customerEmail, password }).expect(200);
    await customerAgent.get('/api/auth/admin-check').expect(403);

    const adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/auth/login').send({ email: adminEmail, password }).expect(200);
    await adminAgent.get('/api/auth/admin-check').expect(200);
  });

  it('invalidates the session on logout', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/login').send({ email: customerEmail, password }).expect(200);
    await agent.get('/api/auth/me').expect(200);

    await agent.post('/api/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
  });
});
