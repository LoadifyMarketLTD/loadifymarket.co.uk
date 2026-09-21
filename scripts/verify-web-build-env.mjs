import { loadEnv } from 'vite';

const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
const fileEnv = loadEnv(mode, process.cwd(), '');
const supabaseUrl = String(process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = String(process.env.VITE_SUPABASE_ANON_KEY ?? fileEnv.VITE_SUPABASE_ANON_KEY ?? '').trim();

const errors = [];
if (!supabaseUrl) errors.push('VITE_SUPABASE_URL is missing');
if (!supabaseAnonKey) errors.push('VITE_SUPABASE_ANON_KEY is missing');

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:') errors.push('VITE_SUPABASE_URL must use https');
  } catch {
    errors.push('VITE_SUPABASE_URL is invalid');
  }
}

if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ') && !supabaseAnonKey.startsWith('sb_publishable_')) {
  errors.push('VITE_SUPABASE_ANON_KEY is not a supported public client key');
}

if (errors.length > 0) {
  console.error('WEB_BUILD_ENV=FAIL');
  for (const error of errors) console.error('- ' + error);
  console.error('Use Netlify production context or provide the required public Supabase build variables before building.');
  process.exit(1);
}

console.log('WEB_BUILD_ENV=PASS');
console.log('Supabase public build configuration is present and valid.');
