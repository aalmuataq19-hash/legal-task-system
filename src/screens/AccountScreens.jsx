import { useState } from 'react';
import { Ban, KeyRound, LogOut, RefreshCw, WifiOff } from 'lucide-react';
import { arabicError } from '../lib/format.js';
import { Alert, Button, Field, PasswordInput } from '../ui.jsx';
import AuthShell from './AuthShell.jsx';

export function ChangePasswordForm({ supabase, onDone, currentLabel = 'كلمة المرور الحالية', submitLabel = 'حفظ كلمة المرور' }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.next.length < 8) return setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
    if (form.next !== form.confirm) return setError('كلمتا المرور الجديدتان غير متطابقتين');
    setLoading(true);
    const { error: rpcError } = await supabase.rpc('change_my_password', { p_current: form.current, p_new: form.next });
    setLoading(false);
    if (rpcError) return setError(arabicError(rpcError));
    setForm({ current: '', next: '', confirm: '' });
    await onDone?.();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={currentLabel} required>
        {(id) => <PasswordInput id={id} value={form.current} onChange={set('current')} />}
      </Field>
      <Field label="كلمة المرور الجديدة" required hint="8 أحرف على الأقل">
        {(id) => <PasswordInput id={id} value={form.next} onChange={set('next')} autoComplete="new-password" />}
      </Field>
      <Field label="تأكيد كلمة المرور الجديدة" required>
        {(id) => <PasswordInput id={id} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />}
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" icon={KeyRound} loading={loading} disabled={!form.current || !form.next} className="w-full py-3">
        {submitLabel}
      </Button>
    </form>
  );
}

export function ForcePasswordChange({ supabase, member, settings, onDone, onSignOut }) {
  return (
    <AuthShell settings={settings} subtitle={`مرحباً ${member.name}`} title="اختر كلمة مرور جديدة">
      <Alert tone="info" className="mb-5">
        لحماية حسابك، يجب تغيير كلمة المرور المؤقتة التي أعطاك إياها المدير قبل المتابعة.
      </Alert>
      <ChangePasswordForm supabase={supabase} onDone={onDone} currentLabel="كلمة المرور المؤقتة" submitLabel="حفظ والمتابعة" />
      <Button variant="ghost" icon={LogOut} onClick={onSignOut} className="mt-3 w-full">
        تسجيل الخروج
      </Button>
    </AuthShell>
  );
}

export function NoAccess({ disabled, onSignOut }) {
  return (
    <AuthShell title={disabled ? 'الحساب معطّل' : 'لا توجد صلاحية'}>
      <div className="flex flex-col items-center gap-4 text-center">
        <Ban className="size-12 text-red-500" />
        <p className="text-slate-600">
          {disabled
            ? 'تم تعطيل هذا الحساب. تواصل مع مدير المكتب إذا كنت تعتقد أن هذا خطأ.'
            : 'هذا الحساب غير مسجل في النظام. اطلب من مدير المكتب إضافتك.'}
        </p>
        <Button variant="secondary" icon={LogOut} onClick={onSignOut} className="w-full">
          تسجيل الخروج
        </Button>
      </div>
    </AuthShell>
  );
}

export function ConnectionError({ message, onRetry, onSignOut }) {
  const [loading, setLoading] = useState(false);
  const retry = async () => {
    setLoading(true);
    try {
      await onRetry();
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthShell title="تعذر الاتصال">
      <div className="flex flex-col items-center gap-4 text-center">
        <WifiOff className="size-12 text-slate-400" />
        <p className="text-slate-700">{message}</p>
        {/تعذر الاتصال/.test(message) && (
          <Alert tone="info" className="text-right">
            للمدير: إذا لم يُستخدم النظام لأكثر من أسبوع، قد يكون مشروع Supabase المجاني متوقفاً مؤقتاً. افتح لوحة Supabase واضغط <b>Restore project</b> ثم أعد المحاولة.
          </Alert>
        )}
        <Button icon={RefreshCw} loading={loading} onClick={retry} className="w-full">
          إعادة المحاولة
        </Button>
        {onSignOut && (
          <Button variant="ghost" icon={LogOut} onClick={onSignOut} className="w-full">
            تسجيل الخروج
          </Button>
        )}
      </div>
    </AuthShell>
  );
}

