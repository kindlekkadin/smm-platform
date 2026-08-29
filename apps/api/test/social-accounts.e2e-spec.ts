import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Social Accounts (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const ownerEmail = `sa-e2e-owner-${runId}@example.com`;
  const otherEmail = `sa-e2e-other-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';

  let ownerAgent: ReturnType<typeof request.agent>;
  let otherAgent: ReturnType<typeof request.agent>;

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

    ownerAgent = request.agent(app.getHttpServer());
    otherAgent = request.agent(app.getHttpServer());

    await ownerAgent
      .post('/api/auth/register')
      .send({ email: ownerEmail, password, displayName: 'SA Owner' })
      .expect(201);
    await ownerAgent.post('/api/auth/login').send({ email: ownerEmail, password }).expect(200);

    await otherAgent
      .post('/api/auth/register')
      .send({ email: otherEmail, password, displayName: 'SA Other' })
      .expect(201);
    await otherAgent.post('/api/auth/login').send({ email: otherEmail, password }).expect(200);
  });

  afterAll(async () => {
    await prisma.socialAccount.deleteMany({
      where: { user: { email: { in: [ownerEmail, otherEmail] } } },
    });
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, otherEmail] } } });
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/api/social-accounts').expect(401);
  });

  it('lists no accounts for a fresh user', async () => {
    const res = await ownerAgent.get('/api/social-accounts').expect(200);
    expect(res.body.accounts).toEqual([]);
  });

  it('connects an account via the dev/mock provider, never exposing the token', async () => {
    const initiateRes = await ownerAgent.post('/api/social-accounts/DEV_MOCK/connect').expect(201);
    expect(initiateRes.body.state).toBeDefined();
    expect(initiateRes.body.authorizationUrl).toContain('mock-consent');

    const completeRes = await ownerAgent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: initiateRes.body.state, mockUsername: `owner_acct_${runId}` })
      .expect(201);

    const account = completeRes.body.account;
    expect(account.platform).toBe('DEV_MOCK');
    expect(account.username).toBe(`owner_acct_${runId}`);
    expect(account.status).toBe('ACTIVE');
    expect(JSON.stringify(completeRes.body)).not.toMatch(/accessToken/i);

    const listRes = await ownerAgent.get('/api/social-accounts').expect(200);
    expect(listRes.body.accounts).toHaveLength(1);
    expect(JSON.stringify(listRes.body)).not.toMatch(/accessToken/i);
  });

  it('rejects completing a connection with an unknown state', async () => {
    await ownerAgent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: 'not-a-real-state', mockUsername: 'irrelevant' })
      .expect(400);
  });

  it('rejects an unregistered platform', async () => {
    await ownerAgent.post('/api/social-accounts/INSTAGRAM/connect').expect(501);
  });

  it('retrieves a single account by id, and blocks access from another user', async () => {
    const { body } = await ownerAgent.get('/api/social-accounts').expect(200);
    const accountId = body.accounts[0].id;

    const getRes = await ownerAgent.get(`/api/social-accounts/${accountId}`).expect(200);
    expect(getRes.body.account.id).toBe(accountId);

    await otherAgent.get(`/api/social-accounts/${accountId}`).expect(403);
  });

  it('rejects connecting a duplicate active account', async () => {
    const initiateRes = await ownerAgent.post('/api/social-accounts/DEV_MOCK/connect').expect(201);
    await ownerAgent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: initiateRes.body.state, mockUsername: `owner_acct_${runId}` })
      .expect(409);
  });

  it('disconnects an account, after which it is no longer active and can be reconnected', async () => {
    const { body } = await ownerAgent.get('/api/social-accounts').expect(200);
    const accountId = body.accounts[0].id;

    const disconnectRes = await ownerAgent.delete(`/api/social-accounts/${accountId}`).expect(200);
    expect(disconnectRes.body.account.status).toBe('DISCONNECTED');

    const getRes = await ownerAgent.get(`/api/social-accounts/${accountId}`).expect(200);
    expect(getRes.body.account.status).toBe('DISCONNECTED');

    // Reconnecting the same platform account should succeed now that it's inactive.
    const initiateRes = await ownerAgent.post('/api/social-accounts/DEV_MOCK/connect').expect(201);
    const reconnectRes = await ownerAgent
      .post('/api/social-accounts/DEV_MOCK/connect/complete')
      .send({ state: initiateRes.body.state, mockUsername: `owner_acct_${runId}` })
      .expect(201);
    expect(reconnectRes.body.account.id).toBe(accountId);
    expect(reconnectRes.body.account.status).toBe('ACTIVE');
  });

  it('blocks another user from disconnecting an account they do not own', async () => {
    const { body } = await ownerAgent.get('/api/social-accounts').expect(200);
    const accountId = body.accounts[0].id;

    await otherAgent.delete(`/api/social-accounts/${accountId}`).expect(403);
  });
});
