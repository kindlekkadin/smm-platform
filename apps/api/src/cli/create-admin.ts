import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { PASSWORD_SALT_ROUNDS } from '../auth/auth.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CreateAdminInput {
  email: string;
  password: string;
  displayName: string;
}

function parseArgs(argv: string[]): Partial<CreateAdminInput> {
  const result: Partial<CreateAdminInput> = {};
  for (const arg of argv) {
    const match = /^--(email|password|name)=(.*)$/.exec(arg);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'email') result.email = value;
    if (key === 'password') result.password = value;
    if (key === 'name') result.displayName = value;
  }
  return result;
}

/**
 * Resolves input from --flags first, falling back to ADMIN_EMAIL /
 * ADMIN_PASSWORD / ADMIN_DISPLAY_NAME env vars. Prefer the env vars in any
 * non-interactive/CI provisioning step — a --password flag lands in shell
 * history and process listings, which an env var injected by the host's
 * secret manager does not.
 */
function resolveInput(argv: string[]): CreateAdminInput {
  const fromArgs = parseArgs(argv);
  const email = fromArgs.email ?? process.env.ADMIN_EMAIL;
  const password = fromArgs.password ?? process.env.ADMIN_PASSWORD;
  const displayName = fromArgs.displayName ?? process.env.ADMIN_DISPLAY_NAME;

  const missing: string[] = [];
  if (!email) missing.push('email (--email or ADMIN_EMAIL)');
  if (!password) missing.push('password (--password or ADMIN_PASSWORD)');
  if (!displayName) missing.push('name (--name or ADMIN_DISPLAY_NAME)');
  if (missing.length > 0) {
    throw new Error(
      `Missing required input: ${missing.join(', ')}\n\n` +
        'Usage:\n' +
        '  pnpm cli create-admin --email=admin@example.com --password=... --name="Site Admin"\n' +
        'Or via environment variables (preferred for non-interactive/CI use, since a\n' +
        '--password flag is visible in shell history and process listings):\n' +
        '  ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_DISPLAY_NAME=... pnpm cli create-admin',
    );
  }

  // Same constraints as RegisterDto — this account still has to log in
  // through the normal /api/auth/login flow.
  if (!EMAIL_PATTERN.test(email!)) {
    throw new Error(`"${email}" is not a valid email address`);
  }
  if (password!.length < 8 || password!.length > 72) {
    throw new Error('password must be between 8 and 72 characters (bcrypt ignores anything past 72)');
  }
  if (displayName!.length < 1 || displayName!.length > 100) {
    throw new Error('name must be between 1 and 100 characters');
  }

  return { email: email!, password: password!, displayName: displayName! };
}

export async function createAdmin(argv: string[]): Promise<void> {
  const input = resolveInput(argv);
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      if (existing.role === UserRole.ADMIN) {
        console.log(`An ADMIN account already exists for ${input.email} (id: ${existing.id}). No action taken.`);
        return;
      }
      throw new Error(
        `An account already exists for ${input.email} with role ${existing.role}. ` +
          'Refusing to silently change its role — update it deliberately via the admin API/DB if that is intended.',
      );
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const created = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    console.log(`Created ADMIN account for ${created.email} (id: ${created.id}).`);
  } finally {
    await prisma.$disconnect();
  }
}
