import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('Manual Top-Ups (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  const adminEmail = `mtu-e2e-admin-${runId}@example.com`;
  const ownerEmail = `mtu-e2e-owner-${runId}@example.com`;
  const otherEmail = `mtu-e2e-other-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';

  let adminAgent: ReturnType<typeof request.agent>;
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

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(password, 10),
        displayName: 'Manual Top-Up Admin',
        role: UserRole.ADMIN,
      },
    });
    adminAgent = request.agent(app.getHttpServer());
    await adminAgent.post('/api/auth/login').send({ email: adminEmail, password }).expect(200);

    ownerAgent = request.agent(app.getHttpServer());
    await ownerAgent
      .post('/api/auth/register')
      .send({ email: ownerEmail, password, displayName: 'Manual Top-Up Owner' })
      .expect(201);
    await ownerAgent.post('/api/auth/login').send({ email: ownerEmail, password }).expect(200);

    otherAgent = request.agent(app.getHttpServer());
    await otherAgent
      .post('/api/auth/register')
      .send({ email: otherEmail, password, displayName: 'Manual Top-Up Other' })
      .expect(201);
    await otherAgent.post('/api/auth/login').send({ email: otherEmail, password }).expect(200);
  });

  afterAll(async () => {
    await prisma.walletTransaction.deleteMany({
      where: { user: { email: { in: [ownerEmail, otherEmail] } } },
    });
    await prisma.manualTopUpSettings.deleteMany({});
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, ownerEmail, otherEmail] } } });
    await app.close();
  });

  describe('settings', () => {
    it('starts unconfigured — the honest "not set up" state, not a fabricated placeholder', async () => {
      const res = await ownerAgent.get('/api/manual-topup-settings').expect(200);
      expect(res.body.settings).toBeNull();
    });

    it('rejects a non-admin from updating settings', async () => {
      await ownerAgent
        .put('/api/admin/manual-topup-settings')
        .send({ accountName: 'Should not work' })
        .expect(403);
    });

    it('lets an admin set the receiving account details, then anyone can read them', async () => {
      await adminAgent
        .put('/api/admin/manual-topup-settings')
        .send({
          bankName: 'Test Bank',
          accountName: 'Hayathmanager Test',
          accountNumber: '1234567890',
          instructions: 'Include your reference number in the transfer notes.',
        })
        .expect(200);

      const res = await ownerAgent.get('/api/manual-topup-settings').expect(200);
      expect(res.body.settings.bankName).toBe('Test Bank');
      expect(res.body.settings.accountNumber).toBe('1234567890');
    });
  });

  describe('submitting a manual top-up', () => {
    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/wallet/manual-top-up')
        .send({ amount: 50, referenceNumber: 'REF123' })
        .expect(401);
    });

    it('rejects a non-positive amount', async () => {
      await ownerAgent
        .post('/api/wallet/manual-top-up')
        .send({ amount: 0, referenceNumber: 'REF123' })
        .expect(400);
    });

    it('rejects a missing/blank reference number', async () => {
      await ownerAgent.post('/api/wallet/manual-top-up').send({ amount: 50 }).expect(400);
      await ownerAgent
        .post('/api/wallet/manual-top-up')
        .send({ amount: 50, referenceNumber: '   ' })
        .expect(400);
    });

    it('creates a PENDING wallet transaction that does not yet affect the balance', async () => {
      const res = await ownerAgent
        .post('/api/wallet/manual-top-up')
        .send({ amount: 50, referenceNumber: 'GCASH-REF-001' })
        .expect(201);

      expect(res.body.transaction.status).toBe('PENDING');
      expect(res.body.transaction.type).toBe('MANUAL_TOP_UP');
      expect(res.body.transaction.referenceNumber).toBe('GCASH-REF-001');

      const walletRes = await ownerAgent.get('/api/wallet').expect(200);
      expect(walletRes.body.balance).toBe('0');
    });
  });

  describe('admin review', () => {
    it('rejects a non-admin from listing pending requests', async () => {
      await ownerAgent.get('/api/admin/manual-top-ups').expect(403);
    });

    it('lists the pending request for an admin', async () => {
      const res = await adminAgent.get('/api/admin/manual-top-ups').expect(200);
      expect(
        res.body.transactions.some((t: { referenceNumber: string }) => t.referenceNumber === 'GCASH-REF-001'),
      ).toBe(true);
    });

    it('rejects a non-admin from approving', async () => {
      const submitRes = await otherAgent
        .post('/api/wallet/manual-top-up')
        .send({ amount: 10, referenceNumber: 'OTHER-REF-1' })
        .expect(201);

      await ownerAgent
        .patch(`/api/admin/manual-top-ups/${submitRes.body.transaction.id}/approve`)
        .expect(403);
    });

    it('approving atomically credits the balance, and a second approval fails', async () => {
      const submitRes = await otherAgent
        .post('/api/wallet/manual-top-up')
        .send({ amount: 30, referenceNumber: 'OTHER-REF-2' })
        .expect(201);

      const approveRes = await adminAgent
        .patch(`/api/admin/manual-top-ups/${submitRes.body.transaction.id}/approve`)
        .expect(200);
      expect(approveRes.body.transaction.status).toBe('COMPLETED');

      const walletRes = await otherAgent.get('/api/wallet').expect(200);
      expect(Number(walletRes.body.balance)).toBeGreaterThanOrEqual(30);

      await adminAgent
        .patch(`/api/admin/manual-top-ups/${submitRes.body.transaction.id}/approve`)
        .expect(400);
    });

    it('rejecting a request never credits the balance, and a second review fails', async () => {
      const beforeRes = await otherAgent.get('/api/wallet').expect(200);
      const before = Number(beforeRes.body.balance);

      const submitRes = await otherAgent
        .post('/api/wallet/manual-top-up')
        .send({ amount: 999, referenceNumber: 'OTHER-REF-REJECT' })
        .expect(201);

      const rejectRes = await adminAgent
        .patch(`/api/admin/manual-top-ups/${submitRes.body.transaction.id}/reject`)
        .send({ reason: 'No matching transfer received' })
        .expect(200);
      expect(rejectRes.body.transaction.status).toBe('REJECTED');
      expect(rejectRes.body.transaction.rejectionReason).toBe('No matching transfer received');

      const afterRes = await otherAgent.get('/api/wallet').expect(200);
      expect(Number(afterRes.body.balance)).toBe(before);

      await adminAgent
        .patch(`/api/admin/manual-top-ups/${submitRes.body.transaction.id}/reject`)
        .expect(400);
    });

    it('rejects reviewing a nonexistent request', async () => {
      await adminAgent
        .patch('/api/admin/manual-top-ups/00000000-0000-0000-0000-000000000000/approve')
        .expect(404);
    });
  });
});
