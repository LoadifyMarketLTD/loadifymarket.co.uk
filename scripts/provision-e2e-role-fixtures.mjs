import { createClient } from '@supabase/supabase-js';

const CONFIRMATION = 'ALLOW_DEDICATED_E2E_TEST_ACCOUNTS';
const PRODUCTION_HOSTS = new Set(['loadifymarket.co.uk', 'www.loadifymarket.co.uk']);
const roles = ['buyer', 'seller', 'admin'];

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertSafeEmail(name, email) {
  const lower = email.toLowerCase();
  const localPart = lower.split('@')[0] ?? '';
  if (!lower.includes('@') || (!localPart.includes('e2e') && !localPart.includes('test'))) {
    throw new Error(`${name} must be a dedicated test address whose local-part contains "e2e" or "test"`);
  }
}

function assertSafePassword(name, password) {
  if (password.length < 12) throw new Error(`${name} must be at least 12 characters`);
}

function loadConfig() {
  if (process.env.E2E_FIXTURE_PROVISIONING !== CONFIRMATION) {
    throw new Error(`Refusing fixture mutation. Set E2E_FIXTURE_PROVISIONING=${CONFIRMATION} explicitly.`);
  }

  const baseUrl = new URL(requireEnv('E2E_BASE_URL'));
  if (PRODUCTION_HOSTS.has(baseUrl.hostname.toLowerCase())) {
    throw new Error('Refusing to provision E2E fixtures while E2E_BASE_URL points at production');
  }

  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const namespace = requireEnv('E2E_FIXTURE_NAMESPACE');
  if (!/^[a-z0-9][a-z0-9-_]{2,40}$/i.test(namespace)) {
    throw new Error('E2E_FIXTURE_NAMESPACE must be 3-41 safe alphanumeric/dash/underscore characters');
  }

  const fixtures = roles.map((role) => {
    const upper = role.toUpperCase();
    const email = requireEnv(`E2E_${upper}_EMAIL`).toLowerCase();
    const password = requireEnv(`E2E_${upper}_PASSWORD`);
    assertSafeEmail(`E2E_${upper}_EMAIL`, email);
    assertSafePassword(`E2E_${upper}_PASSWORD`, password);
    return { role, email, password };
  });

  return { baseUrl, supabaseUrl, serviceRoleKey, namespace, fixtures };
}

async function findAuthUserByEmail(supabase, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Unable to list Auth users: ${error.message}`);
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  throw new Error('Auth user scan exceeded the 20,000-user safety bound');
}

async function ensureAuthUser(supabase, fixture, namespace) {
  const existing = await findAuthUserByEmail(supabase, fixture.email);
  if (existing) {
    const metadata = existing.app_metadata ?? {};
    if (metadata.e2e_fixture !== true || metadata.e2e_fixture_namespace !== namespace) {
      throw new Error(`Refusing to reuse non-fixture Auth account ${fixture.email}`);
    }
    if (metadata.role !== fixture.role) {
      throw new Error(`Existing fixture ${fixture.email} has role ${String(metadata.role)}, expected ${fixture.role}`);
    }

    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: fixture.password,
      email_confirm: true,
      app_metadata: { ...metadata, role: fixture.role, e2e_fixture: true, e2e_fixture_namespace: namespace },
    });
    if (error || !data.user) throw new Error(`Unable to refresh ${fixture.role} fixture Auth account: ${error?.message ?? 'unknown error'}`);
    return { user: data.user, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: fixture.email,
    password: fixture.password,
    email_confirm: true,
    app_metadata: {
      role: fixture.role,
      e2e_fixture: true,
      e2e_fixture_namespace: namespace,
    },
    user_metadata: {
      first_name: 'E2E',
      last_name: fixture.role[0].toUpperCase() + fixture.role.slice(1),
    },
  });
  if (error || !data.user) throw new Error(`Unable to create ${fixture.role} fixture Auth account: ${error?.message ?? 'unknown error'}`);
  return { user: data.user, created: true };
}

async function ensureMarketplaceIdentity(supabase, fixture, userId, namespace) {
  const firstName = 'E2E';
  const lastName = fixture.role[0].toUpperCase() + fixture.role.slice(1);
  const { error: userError } = await supabase.from('users').upsert(
    {
      id: userId,
      email: fixture.email,
      firstName,
      lastName,
      role: fixture.role,
      isActive: true,
      isEmailVerified: true,
    },
    { onConflict: 'id' },
  );
  if (userError) throw new Error(`Unable to upsert public.users for ${fixture.role}: ${userError.message}`);

  if (fixture.role === 'seller') {
    const storeName = `E2E Seller ${namespace}`;
    const { error: profileError } = await supabase.from('seller_profiles').upsert(
      {
        userId,
        fullName: `${firstName} ${lastName}`,
        sellerType: 'individual',
        sellerStatus: 'active',
        isApproved: true,
        requiresAdminApproval: false,
        storeName,
      },
      { onConflict: 'userId' },
    );
    if (profileError) throw new Error(`Unable to upsert seller_profiles fixture: ${profileError.message}`);

    const { error: storeError } = await supabase.from('seller_stores').upsert(
      { userId, storeName, isActive: true },
      { onConflict: 'userId' },
    );
    if (storeError) throw new Error(`Unable to upsert seller_stores fixture: ${storeError.message}`);
  }
}

async function verifyFixture(supabase, fixture, userId, namespace) {
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authData.user) throw new Error(`Unable to verify ${fixture.role} Auth fixture`);
  const metadata = authData.user.app_metadata ?? {};
  if (metadata.role !== fixture.role || metadata.e2e_fixture !== true || metadata.e2e_fixture_namespace !== namespace) {
    throw new Error(`${fixture.role} Auth metadata verification failed`);
  }

  const { data: account, error: accountError } = await supabase
    .from('users')
    .select('id, role, isActive, email')
    .eq('id', userId)
    .maybeSingle();
  if (accountError || !account || account.role !== fixture.role || account.isActive !== true) {
    throw new Error(`${fixture.role} public.users verification failed`);
  }

  if (fixture.role === 'seller') {
    const { data: profile, error: profileError } = await supabase
      .from('seller_profiles')
      .select('sellerStatus, isApproved')
      .eq('userId', userId)
      .maybeSingle();
    if (profileError || !profile || profile.sellerStatus !== 'active' || profile.isApproved !== true) {
      throw new Error('Seller fixture profile verification failed');
    }

    const { data: store, error: storeError } = await supabase
      .from('seller_stores')
      .select('isActive')
      .eq('userId', userId)
      .maybeSingle();
    if (storeError || !store || store.isActive !== true) {
      throw new Error('Seller fixture store verification failed');
    }
  }
}

async function main() {
  const config = loadConfig();
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const provisioned = [];
  for (const fixture of config.fixtures) {
    const { user, created } = await ensureAuthUser(supabase, fixture, config.namespace);
    try {
      await ensureMarketplaceIdentity(supabase, fixture, user.id, config.namespace);
      await verifyFixture(supabase, fixture, user.id, config.namespace);
    } catch (error) {
      if (created) {
        await supabase.auth.admin.deleteUser(user.id).catch(() => undefined);
      }
      throw error;
    }
    provisioned.push({ role: fixture.role, email: fixture.email, id: user.id, created });
  }

  console.log(`E2E fixture provisioning verified for ${config.baseUrl.origin}`);
  for (const item of provisioned) {
    console.log(`${item.role}: ${item.email} (${item.created ? 'created' : 'reused verified fixture'}) id=${item.id}`);
  }
  console.log('No products, orders, payouts, Stripe transfers, refunds, or fulfillment records were created.');
}

main().catch((error) => {
  console.error(`E2E fixture provisioning failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
