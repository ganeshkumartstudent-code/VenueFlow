import { spawnSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(start = 8085, end = 8999) {
  for (let port = start; port <= end; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(port);
    if (free) {
      return port;
    }
  }

  throw new Error('No free emulator port found in the configured range.');
}

async function run() {
  const firebaseConfigPath = 'firebase.json';
  const baseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf8'));
  const firestorePort = await findFreePort();

  const rulesPath = baseConfig.firestore?.rules || 'firestore.rules';
  baseConfig.firestore = baseConfig.firestore || {};
  baseConfig.firestore.rules = resolve(process.cwd(), rulesPath);

  baseConfig.emulators = baseConfig.emulators || {};
  baseConfig.emulators.firestore = baseConfig.emulators.firestore || {};
  baseConfig.emulators.firestore.port = firestorePort;

  const tempConfigPath = join(tmpdir(), `firebase.rules.${Date.now()}.json`);
  writeFileSync(tempConfigPath, JSON.stringify(baseConfig, null, 2), 'utf8');

  const firebaseCommand = process.platform === 'win32' ? 'firebase.cmd' : 'firebase';
  const scriptToRun = 'vitest run --config vitest.rules.config.ts';
  const command = `${firebaseCommand} emulators:exec --config "${tempConfigPath}" --only firestore --project demo-venueflow "${scriptToRun}"`;

  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
  });

  try {
    unlinkSync(tempConfigPath);
  } catch {
    // Ignore cleanup errors for temp config files.
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run().catch((error) => {
  console.error('Rules test runner failed:', error);
  process.exit(1);
});
