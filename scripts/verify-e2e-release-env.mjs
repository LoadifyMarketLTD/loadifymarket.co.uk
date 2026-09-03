import process from 'node:process';

const required = [
  'E2E_BASE_URL',
  'E2E_TARGET_SHA',
  'E2E_BUYER_EMAIL',
  'E2E_BUYER_PASSWORD',
  'E2E_SELLER_EMAIL',
  'E2E_SELLER_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_FOREIGN_ORDER_ID',
];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the credentialed E2E release gate`);
  return value;
}

function assertEmail(name, value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address`);
  }
}

function assertPassword(name, value) {
  if (value.length < 12) {
    throw new Error(`${name} must be at least 12 characters`);
  }
}

function assertUuid(name, value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${name} must be a valid UUID`);
  }
}

for (const name of required) requireEnv(name);

const baseUrl = new URL(requireEnv('E2E_BASE_URL'));
if (baseUrl.protocol !== 'https:') {
  throw new Error('E2E_BASE_URL must use HTTPS for release certification');
}

const targetSha = requireEnv('E2E_TARGET_SHA');
if (!/^[0-9a-f]{40}$/i.test(targetSha)) {
  throw new Error('E2E_TARGET_SHA must be a full 40-character Git SHA');
}

const releaseTarget = (process.env.E2E_RELEASE_TARGET ?? 'production').trim().toLowerCase();
if (!['production', 'preview'].includes(releaseTarget)) {
  throw new Error('E2E_RELEASE_TARGET must be either production or preview');
}

if (releaseTarget === 'production') {
  if (baseUrl.hostname.toLowerCase() !== 'loadifymarket.co.uk') {
    throw new Error('Production credentialed E2E must target https://loadifymarket.co.uk');
  }
  if (process.env.E2E_ALLOW_PRODUCTION_READONLY !== 'ALLOW_PRODUCTION_ROLE_E2E') {
    throw new Error(
      'Refusing production credentialed E2E without E2E_ALLOW_PRODUCTION_READONLY=ALLOW_PRODUCTION_ROLE_E2E',
    );
  }
}

const emails = [
  ['E2E_BUYER_EMAIL', requireEnv('E2E_BUYER_EMAIL').toLowerCase()],
  ['E2E_SELLER_EMAIL', requireEnv('E2E_SELLER_EMAIL').toLowerCase()],
  ['E2E_ADMIN_EMAIL', requireEnv('E2E_ADMIN_EMAIL').toLowerCase()],
];
for (const [name, value] of emails) assertEmail(name, value);

if (new Set(emails.map(([, value]) => value)).size !== emails.length) {
  throw new Error('Buyer, Seller, and Admin E2E accounts must be distinct');
}

assertPassword('E2E_BUYER_PASSWORD', requireEnv('E2E_BUYER_PASSWORD'));
assertPassword('E2E_SELLER_PASSWORD', requireEnv('E2E_SELLER_PASSWORD'));
assertPassword('E2E_ADMIN_PASSWORD', requireEnv('E2E_ADMIN_PASSWORD'));
assertUuid('E2E_FOREIGN_ORDER_ID', requireEnv('E2E_FOREIGN_ORDER_ID'));

console.log('Credentialed E2E release preflight PASS');
console.log(`target=${releaseTarget}`);
console.log(`baseURL=${baseUrl.origin}`);
console.log(`targetSha=${targetSha}`);
console.log('roles=buyer,seller,admin');
console.log('foreignOrderFixture=configured');
console.log('No credentials were printed.');
