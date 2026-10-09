import { createClient } from '@supabase/supabase-js';

const REMEMBER_KEY = 'ltm.remember';

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

// "تذكرني": الجلسة تُحفظ في localStorage (تبقى بعد إغلاق المتصفح)
// وإلا في sessionStorage (تنتهي بإغلاق المتصفح)
export const getRemember = () => safe(() => localStorage.getItem(REMEMBER_KEY)) !== '0';
export const setRemember = (value) => safe(() => localStorage.setItem(REMEMBER_KEY, value ? '1' : '0'));

const authStorage = {
  getItem: (key) => safe(() => localStorage.getItem(key)) ?? safe(() => sessionStorage.getItem(key)),
  setItem: (key, value) => {
    const [keep, drop] = getRemember() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    safe(() => keep.setItem(key, value));
    safe(() => drop.removeItem(key));
  },
  removeItem: (key) => {
    safe(() => localStorage.removeItem(key));
    safe(() => sessionStorage.removeItem(key));
  },
};

export function createSupabase({ supabaseUrl, supabaseKey }) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: authStorage,
      storageKey: 'ltm.auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

// يجلب كل الصفوف حتى لو تجاوزت حد الـ 1000 صف للطلب الواحد
export async function fetchAll(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}
