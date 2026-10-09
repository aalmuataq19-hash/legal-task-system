export const CASE_TYPES = [
  'قضايا مدنية',
  'قضايا تجارية',
  'قضايا عمالية',
  'قضايا أسرية',
  'قضايا جنائية',
  'قضايا إدارية',
  'استشارات قانونية',
  'صياغة عقود',
];

export const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  in_progress: 'قيد التنفيذ',
  completed: 'منجزة',
};

export const ROLE_LABELS = { admin: 'مدير', employee: 'موظف' };

const HOUR = 3600e3;
const DAY = 24 * HOUR;

// حالة المهمة الزمنية: منجزة / متأخرة / خلال 24 ساعة / عادية
export function taskUrgency(task, now = Date.now()) {
  if (task.status === 'completed') return 'completed';
  const due = new Date(task.due_at).getTime();
  if (due < now) return 'overdue';
  if (due - now <= DAY) return 'soon';
  return 'normal';
}

const dateFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDateFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
const hijriFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const relFmt = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

export const formatDate = (iso) => dateFmt.format(new Date(iso));
export const formatShortDate = (iso) => shortDateFmt.format(new Date(iso));
export const formatTime = (iso) => timeFmt.format(new Date(iso));
export const formatHijri = (iso) => hijriFmt.format(new Date(iso));

export function formatRelative(iso, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < HOUR) return relFmt.format(Math.round(diff / 60e3), 'minute');
  if (abs < DAY) return relFmt.format(Math.round(diff / HOUR), 'hour');
  return relFmt.format(Math.round(diff / DAY), 'day');
}

// تحويل بين قيمة حقل datetime-local (بالتوقيت المحلي) وتاريخ ISO
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function generatePassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export function normalizeArabic(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

// ترجمة أخطاء الخادم لرسائل عربية مفهومة
export function arabicError(error) {
  if (!error) return '';
  const message = String(error.message || error.error_description || error || '');
  const code = error.code;
  if (/invalid login credentials/i.test(message)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (/banned/i.test(message)) return 'هذا الحساب معطّل. تواصل مع مدير المكتب';
  if (/rate limit|too many/i.test(message)) return 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) {
    return 'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت ثم حاول مرة أخرى';
  }
  if (code === 'PGRST202' || code === 'PGRST205' || code === '42P01' || code === '42883') {
    return 'قاعدة البيانات غير مهيأة. يجب تشغيل كود الإعداد في Supabase';
  }
  if (/[؀-ۿ]/.test(message)) return message;
  if (code === '42501') return 'ليس لديك صلاحية لهذه العملية';
  if (code === '23514' || code === '22001') return 'بعض البيانات المدخلة غير صحيحة أو طويلة جداً';
  if (code === '23503') return 'لا يمكن تنفيذ العملية لارتباطها ببيانات أخرى';
  if (code === 'PGRST301' || code === 'PGRST303' || /jwt/i.test(message)) return 'انتهت الجلسة. سجّل الدخول مرة أخرى';
  return 'حدث خطأ غير متوقع. حاول مرة أخرى';
}
