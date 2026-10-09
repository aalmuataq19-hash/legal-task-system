import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { arabicError } from '../lib/format.js';
import { setRemember } from '../lib/supabase.js';
import { Alert, Button, Field, PasswordInput, inputClass } from '../ui.jsx';
import AuthShell from './AuthShell.jsx';

// تظهر مرة واحدة فقط: عندما لا يوجد أي مدير في النظام
export default function CreateAdmin({ supabase, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('الاسم مطلوب');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return setError('البريد الإلكتروني غير صحيح');
    if (form.password.length < 8) return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    if (form.password !== form.confirm) return setError('كلمتا المرور غير متطابقتين');

    setLoading(true);
    const email = form.email.trim().toLowerCase();
    const { error: rpcError } = await supabase.rpc('setup_first_admin', {
      p_name: form.name.trim(),
      p_email: email,
      p_password: form.password,
    });
    if (rpcError) {
      setLoading(false);
      return setError(arabicError(rpcError));
    }
    setRemember(true);
    await supabase.auth.signInWithPassword({ email, password: form.password });
    await onDone();
  };

  return (
    <AuthShell subtitle="الإعداد الأولي" title="إنشاء حساب مدير المكتب">
      <Alert tone="info" className="mb-5">
        هذه الخطوة تتم مرة واحدة فقط. حساب المدير يستطيع إضافة الموظفين وتوزيع المهام وإدارة النظام.
      </Alert>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="الاسم الكامل" required>
          {(id) => <input id={id} className={inputClass} value={form.name} onChange={set('name')} autoComplete="name" />}
        </Field>
        <Field label="البريد الإلكتروني" required hint="سيُستخدم لتسجيل الدخول">
          {(id) => (
            <input id={id} type="email" inputMode="email" dir="ltr" autoComplete="username" className={`${inputClass} text-left`} value={form.email} onChange={set('email')} />
          )}
        </Field>
        <Field label="كلمة المرور" required hint="8 أحرف على الأقل">
          {(id) => <PasswordInput id={id} value={form.password} onChange={set('password')} autoComplete="new-password" />}
        </Field>
        <Field label="تأكيد كلمة المرور" required>
          {(id) => <PasswordInput id={id} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />}
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" icon={ShieldCheck} loading={loading} className="w-full py-3 text-base">
          إنشاء الحساب والدخول
        </Button>
      </form>
    </AuthShell>
  );
}
