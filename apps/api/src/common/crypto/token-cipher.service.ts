import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts sensitive social-platform credentials (access/refresh tokens) at rest
 * using AES-256-GCM with a key from SOCIAL_TOKEN_ENCRYPTION_KEY.
 *
 * This is the smallest safe approach for local development: it keeps tokens out
 * of plaintext in the database and out of logs/backups in the clear. It is NOT a
 * production-grade secrets solution — production should use a managed secret
 * store / KMS (e.g. AWS KMS, HashiCorp Vault) for key management and rotation
 * instead of a static key from an environment variable.
 */
@Injectable()
export class TokenCipherService {
  private readonly key: Buffer;

  constructor() {
    const rawKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    if (!rawKey) {
      throw new InternalServerErrorException(
        'SOCIAL_TOKEN_ENCRYPTION_KEY is not configured',
      );
    }
    const key = Buffer.from(rawKey, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'SOCIAL_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes',
      );
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv, authTag, ciphertext].map((buf) => buf.toString('base64')).join('.');
  }

  decrypt(payload: string): string {
    const [ivB64, authTagB64, ciphertextB64] = payload.split('.');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
