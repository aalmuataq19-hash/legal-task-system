import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { arabicError } from '../lib/format.js';
import { getRemember, setRemember } from '../lib/supabase.js';
import { Alert, Button, Field, PasswordInput, inputClass } from '../ui.jsx';
import AuthShell from './AuthShell.jsx';

export default function Login({ supabase, settings }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRememberState] = useState(getRemember);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setRemember(remember);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (signInError) setError(arabicError(signInError));
  };

  return (
    <AuthShell settings={settings} subtitle="سجّل دخولك للمتابعة" title="تسجيل الدخول">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="البريد الإلكتروني">
          {(id) => (
            <input
              id={id}
              type="email"
              inputMode="email"
              autoComplete="username"
              dir="ltr"
              className={`${inputClass} text-left`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="كلمة المرور">
          {(id) => <PasswordInput id={id} value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRememberState(e.target.checked)}
            className="size-4 rounded border-slate-300 accent-indigo-700"
          />
          تذكرني على هذا الجهاز
        </label>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" icon={LogIn} loading={loading} disabled={!email || !password} className="w-full py-3 text-base">
          دخول
        </Button>
        <p className="text-center text-xs text-slate-500">نسيت كلمة المرور؟ تواصل مع مدير المكتب لإعادة تعيينها.</p>
      </form>
    </AuthShell>
  );
}
