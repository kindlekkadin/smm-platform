import { TokenCipherService } from './token-cipher.service';

describe('TokenCipherService', () => {
  const originalEnv = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  afterAll(() => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = originalEnv;
  });

  it('round-trips a plaintext value', () => {
    const cipher = new TokenCipherService();
    const ciphertext = cipher.encrypt('super-secret-token');
    expect(ciphertext).not.toContain('super-secret-token');
    expect(cipher.decrypt(ciphertext)).toBe('super-secret-token');
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const cipher = new TokenCipherService();
    const a = cipher.encrypt('same-value');
    const b = cipher.encrypt('same-value');
    expect(a).not.toBe(b);
  });

  it('throws if the encryption key is missing', () => {
    delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    expect(() => new TokenCipherService()).toThrow();
  });

  it('throws if the encryption key is the wrong length', () => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64');
    expect(() => new TokenCipherService()).toThrow();
  });
});
