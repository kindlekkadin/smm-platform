import { sensitiveThrottle } from './sensitive-throttle.util';

describe('sensitiveThrottle', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('uses the given limit outside of a test environment', () => {
    process.env.NODE_ENV = 'production';
    expect(sensitiveThrottle(20)).toEqual({ default: { limit: 20, ttl: 60_000 } });
  });

  it('relaxes the limit under Jest (NODE_ENV=test) so e2e suites are not throttled', () => {
    process.env.NODE_ENV = 'test';
    expect(sensitiveThrottle(20)).toEqual({ default: { limit: 2000, ttl: 60_000 } });
  });

  it('accepts a custom ttl', () => {
    process.env.NODE_ENV = 'production';
    expect(sensitiveThrottle(10, 30_000)).toEqual({ default: { limit: 10, ttl: 30_000 } });
  });
});
