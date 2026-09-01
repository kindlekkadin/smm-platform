import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Public Stats (e2e)', () => {
  let app: INestApplication<App>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns real, non-negative aggregate counts without authentication', async () => {
    const res = await request(app.getHttpServer()).get('/api/public/stats').expect(200);

    expect(typeof res.body.availableServices).toBe('number');
    expect(typeof res.body.ordersProcessed).toBe('number');
    expect(typeof res.body.activeUsers).toBe('number');
    expect(res.body.availableServices).toBeGreaterThanOrEqual(0);
    expect(res.body.ordersProcessed).toBeGreaterThanOrEqual(0);
    expect(res.body.activeUsers).toBeGreaterThanOrEqual(0);
  });
});
