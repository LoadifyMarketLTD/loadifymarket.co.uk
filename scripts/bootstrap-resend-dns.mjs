const expectedContext = 'deploy-preview';
const expectedHead = 'diag/resend-cloudflare-dns-20260905';

if (process.env.CONTEXT !== expectedContext || process.env.HEAD !== expectedHead) {
  console.log('Resend DNS bootstrap: skipped outside the dedicated deploy preview.');
  process.exit(0);
}

const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;

if (!token || !zoneId) {
  throw new Error('Resend DNS bootstrap: Cloudflare credentials are not configured.');
}

const apiBase = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
const desiredRecords = [
  {
    type: 'TXT',
    name: 'resend._domainkey.loadifymarket.co.uk',
    content: 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDiDUzZHLBDGgzn74IvRqJwC8KlqNOuo/BGoZNZZNtLLRTpk8KgsojCgVBMEXVhCSS7uVya6m3tjGWq4MhZETyE9W1P6A9IQxbEo3jkU3oSeQAtb8O3Gf44i07xzwfaa5cjR5PtpeTx6BaQ5cs3hsWrjGzu+jKU69TDS9WwuepyWwIDAQAB',
    ttl: 3600,
  },
  {
    type: 'MX',
    name: 'send.loadifymarket.co.uk',
    content: 'feedback-smtp.eu-west-1.amazonses.com',
    priority: 10,
    ttl: 3600,
  },
  {
    type: 'TXT',
    name: 'send.loadifymarket.co.uk',
    content: 'v=spf1 include:amazonses.com ~all',
    ttl: 3600,
  },
];

async function cloudflare(path = '', init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const payload = await response.json();
  if (!response.ok || payload.success !== true) {
    const messages = [...(payload.errors || []), ...(payload.messages || [])]
      .map((entry) => entry?.message)
      .filter(Boolean)
      .join('; ');
    throw new Error(`Cloudflare DNS API failed (${response.status})${messages ? `: ${messages}` : ''}`);
  }
  return payload.result;
}

function sameRecord(existing, desired) {
  return (
    existing.type === desired.type &&
    existing.name === desired.name &&
    existing.content === desired.content &&
    (desired.type !== 'MX' || Number(existing.priority) === Number(desired.priority))
  );
}

const desiredNames = [...new Set(desiredRecords.map((record) => record.name))];
const existingByName = new Map();

for (const name of desiredNames) {
  const records = await cloudflare(`?name=${encodeURIComponent(name)}&per_page=100`);
  existingByName.set(name, records);
}

for (const desired of desiredRecords) {
  const existing = existingByName.get(desired.name) || [];
  if (existing.some((record) => sameRecord(record, desired))) continue;

  const conflictingSameType = existing.find(
    (record) => record.type === desired.type && !sameRecord(record, desired),
  );
  const conflictingCname = existing.find((record) => record.type === 'CNAME');

  if (conflictingSameType || conflictingCname) {
    throw new Error(`Resend DNS bootstrap: refusing to overwrite existing DNS at ${desired.name}.`);
  }
}

let created = 0;
for (const desired of desiredRecords) {
  const existing = existingByName.get(desired.name) || [];
  if (existing.some((record) => sameRecord(record, desired))) {
    console.log(`Resend DNS bootstrap: ${desired.type} ${desired.name} already present.`);
    continue;
  }

  await cloudflare('', {
    method: 'POST',
    body: JSON.stringify(desired),
  });
  created += 1;
  console.log(`Resend DNS bootstrap: created ${desired.type} ${desired.name}.`);
}

console.log(`Resend DNS bootstrap complete: ${created} record(s) created, no existing records overwritten.`);
