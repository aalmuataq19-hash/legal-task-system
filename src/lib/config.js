// إعدادات الاتصال تُقرأ من public/config.json وقت التشغيل،
// فيمكن تغييرها بدون إعادة بناء الكود.
export async function loadConfig() {
  const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' });
  if (!res.ok) return null;
  const raw = await res.json();
  const supabaseUrl = normalizeUrl(raw.supabaseUrl);
  const supabaseKey = String(raw.supabaseKey || '').trim();
  if (!supabaseUrl || !supabaseKey) return null;
  return { supabaseUrl, supabaseKey };
}

// يقبل رابط المشروع، أو رابط لوحة التحكم ويحوّله لرابط المشروع
export function normalizeUrl(input) {
  const value = String(input || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  const dashboard = value.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboard) return `https://${dashboard[1].toLowerCase()}.supabase.co`;
  if (/^[a-z0-9]{20}$/i.test(value)) return `https://${value.toLowerCase()}.supabase.co`;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '';
  }
}

function jwtRole(key) {
  try {
    const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role;
  } catch {
    return null;
  }
}

// يرجع رسالة خطأ إذا كان المفتاح غير مناسب، أو null إذا كان سليماً
export function checkKey(key) {
  const value = String(key || '').trim();
  if (!value) return 'المفتاح مطلوب';
  if (value.startsWith('sb_secret_') || jwtRole(value) === 'service_role') {
    return 'هذا مفتاح سري (secret / service_role) ولا يجوز وضعه في الموقع. استخدم المفتاح العام: publishable أو anon';
  }
  if (value.startsWith('sb_publishable_') || jwtRole(value) === 'anon') return null;
  return 'المفتاح غير صحيح. انسخ المفتاح العام (publishable أو anon public)';
}
