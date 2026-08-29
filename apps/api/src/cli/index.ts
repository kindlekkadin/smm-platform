import { createAdmin } from './create-admin';

const COMMANDS: Record<string, (argv: string[]) => Promise<void>> = {
  'create-admin': createAdmin,
};

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const handler = command ? COMMANDS[command] : undefined;

  if (!handler) {
    console.error(`Usage: pnpm cli <command> [options]\n\nAvailable commands:\n  ${Object.keys(COMMANDS).join('\n  ')}`);
    process.exitCode = 1;
    return;
  }

  await handler(rest);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
