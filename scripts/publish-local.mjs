#!/usr/bin/env node
/**
 * publish-local.mjs — one-command local release to the Verdaccio registry.
 *
 * Does the whole end-to-end loop for smoke-testing the published @bridgebyte/sst-* packages:
 *   1. ensures the local Verdaccio registry is running (starts it if needed)
 *   2. ensures a local "dev" auth token (writes the gitignored root .npmrc)
 *   3. builds every package (skip with --no-build)
 *   4. (re)publishes every @bridgebyte/sst-* package to the local registry
 *   5. with --with-tests, refreshes + installs the test/* consumer apps
 *
 * Usage:
 *   npm run publish:local                 # build + publish all packages
 *   npm run publish:local -- --with-tests # also reinstall the test apps
 *   npm run publish:local -- --no-build   # publish current dist/ as-is
 *
 * Env overrides: SST_REGISTRY (default http://localhost:4873),
 *                SST_REGISTRY_USER / SST_REGISTRY_PASS (default dev / dev).
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = (process.env.SST_REGISTRY || 'http://localhost:4873').replace(/\/$/, '');
const USER = process.env.SST_REGISTRY_USER || 'dev';
const PASS = process.env.SST_REGISTRY_PASS || 'dev';

const args = process.argv.slice(2);
const NO_BUILD = args.includes('--no-build');
const WITH_TESTS = args.includes('--with-tests') || args.includes('--tests');

// dir = directory whose package.json/contents get published.
// @bridgebyte/sst-ng is published from its ng-packagr output (packages/ng/dist).
const PACKAGES = [
  { name: '@bridgebyte/sst-core', dir: 'packages/core' },
  { name: '@bridgebyte/sst-dom', dir: 'packages/dom' },
  { name: '@bridgebyte/sst-react', dir: 'packages/react' },
  { name: '@bridgebyte/sst-vue', dir: 'packages/vue' },
  { name: '@bridgebyte/sst-ng', dir: 'packages/ng/dist' },
];
const TEST_APPS = ['dom', 'vue', 'ng'];

const log = (m) => console.log(`\x1b[36m[publish-local]\x1b[0m ${m}`);
const die = (m) => {
  console.error(`\x1b[31m[publish-local] ${m}\x1b[0m`);
  process.exit(1);
};

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: false, ...opts });
  return r.status ?? 1;
}

async function registryUp() {
  try {
    const res = await fetch(`${REGISTRY}/`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureRegistry() {
  if (await registryUp()) {
    log(`registry already running at ${REGISTRY}`);
    return;
  }
  const bin = resolve(ROOT, 'node_modules/.bin/verdaccio');
  if (!existsSync(bin)) die('verdaccio not installed — run `npm install` at the repo root first.');
  log('registry not reachable — starting Verdaccio in the background…');
  const logPath = resolve(ROOT, '.verdaccio/verdaccio.log');
  const out = openSync(logPath, 'a');
  const child = spawn(bin, ['--config', '.verdaccio/config.yaml'], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', out, out],
  });
  writeFileSync(resolve(ROOT, '.verdaccio/verdaccio.pid'), String(child.pid));
  child.unref();
  for (let i = 0; i < 60; i++) {
    if (await registryUp()) {
      log(`registry started (pid ${child.pid}, logs → .verdaccio/verdaccio.log). Stop it with \`npm run registry:stop\`.`);
      return;
    }
    await sleep(500);
  }
  die('registry did not come up within 30s — check .verdaccio/verdaccio.log');
}

async function ensureAuth() {
  // Verdaccio's couchdb-style endpoint returns a bearer token for valid creds,
  // whether the user already exists or is being created. Idempotent.
  let token = '';
  try {
    // Basic auth makes this work for both a fresh user (register) and an
    // existing one (login) — without it Verdaccio 409s on the second run.
    const basic = Buffer.from(`${USER}:${PASS}`).toString('base64');
    const res = await fetch(`${REGISTRY}/-/user/org.couchdb.user:${USER}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` },
      body: JSON.stringify({ name: USER, password: PASS, email: `${USER}@local` }),
    });
    const body = await res.json().catch(() => ({}));
    token = body.token || '';
  } catch (e) {
    die(`could not authenticate against ${REGISTRY}: ${e.message}`);
  }
  if (!token) die(`registry did not return an auth token for user "${USER}".`);
  const host = REGISTRY.replace(/^https?:/, '');
  writeFileSync(
    resolve(ROOT, '.npmrc'),
    `@bridgebyte:registry=${REGISTRY}/\n${host}/:_authToken=${token}\n`,
  );
  log(`authenticated as "${USER}" (token written to gitignored root .npmrc)`);
}

function buildAll() {
  if (NO_BUILD) {
    log('skipping build (--no-build)');
    return;
  }
  log('building all packages (nx run-many -t build)…');
  if (run('npx', ['nx', 'run-many', '-t', 'build']) !== 0) die('build failed.');
}

function publishAll() {
  for (const { name, dir } of PACKAGES) {
    const abs = resolve(ROOT, dir);
    if (!existsSync(resolve(abs, 'package.json'))) {
      die(`${name}: ${dir}/package.json missing — did the build run? (remove --no-build)`);
    }
    log(`publishing ${name} from ${dir}`);
    // Allow overwriting the same version on each run: remove it first, ignore errors.
    run('npm', ['unpublish', name, '--registry', REGISTRY, '--force'], { stdio: 'ignore' });
    if (run('npm', ['publish', abs, '--registry', REGISTRY]) !== 0) die(`failed to publish ${name}.`);
  }
}

function installTestApps() {
  if (!WITH_TESTS) {
    log('skipping test-app install (pass --with-tests to enable)');
    return;
  }
  for (const app of TEST_APPS) {
    const dir = `test/${app}`;
    log(`refreshing + installing ${dir} (clears stale @bridgebyte/sst-* lock entries)…`);
    // The lockfiles pin localhost tarball hashes that change on every republish,
    // so they must be regenerated or npm fails with EINTEGRITY.
    run('rm', ['-rf', resolve(ROOT, dir, 'node_modules'), resolve(ROOT, dir, 'package-lock.json')]);
    if (run('npm', ['install', '--prefix', dir]) !== 0) die(`failed to install ${dir}.`);
  }
}

async function main() {
  log(`registry: ${REGISTRY}`);
  await ensureRegistry();
  await ensureAuth();
  buildAll();
  publishAll();
  installTestApps();
  log('\x1b[32mdone.\x1b[0m All @bridgebyte/sst-* packages published to the local registry.');
  if (!WITH_TESTS) {
    log('Next: `npm run publish:local -- --with-tests`, or install a single app, e.g. `npm install --prefix test/ng`.');
  }
}

main().catch((e) => die(e?.stack || String(e)));
