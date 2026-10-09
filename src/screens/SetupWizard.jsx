import { useEffect, useState } from 'react';
import { CircleCheck, Database, ExternalLink, PlugZap, Send } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { checkKey, normalizeUrl } from '../lib/config.js';
import { Alert, Button, CopyButton, Field, inputClass } from '../ui.jsx';
import AuthShell from './AuthShell.jsx';

const SUPABASE_NEW = 'https://supabase.com/dashboard/new';
const SUPABASE_SQL = 'https://supabase.com/dashboard/project/_/sql/new';
const SUPABASE_KEYS = 'https://supabase.com/dashboard/project/_/settings/api-keys';

function Step({ number, title, done, children }) {
  return (
    <section className="flex gap-3">
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-800'}`}
      >
        {done ? <CircleCheck className="size-5" /> : number}
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <h3 className="mb-2 font-bold text-slate-800">{title}</h3>
        <div className="space-y-3 text-sm leading-7 text-slate-600">{children}</div>
      </div>
    </section>
  );
}

function LinkButton({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
    >
      <ExternalLink className="size-4" />
      {children}
    </a>
  );
}

async function testConnection(url, key) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data, error } = await client.rpc('system_status');
    if (!error) return { ok: true, data };
    if (/failed to fetch|load failed|networkerror/i.test(error.message || '')) {
      return { ok: false, message: 'تعذر الوصول إلى الرابط. تأكد من نسخ Project URL بشكل صحيح.' };
    }
    if (['PGRST202', 'PGRST205', '42883'].includes(error.code)) {
      return { ok: false, message: 'الاتصال بالمشروع ناجح، لكن كود الإعداد لم يُشغّل بعد. نفّذ الخطوة 2 ثم أعد الاختبار.' };
    }
    if (/api key|apikey|jwt|unauthorized/i.test(error.message || '')) {
      return { ok: false, message: 'المفتاح لا يخص هذا المشروع. تأكد من نسخ المفتاح العام لنفس المشروع.' };
    }
    return { ok: false, message: `خطأ من الخادم: ${error.message}` };
  } catch {
    return { ok: false, message: 'تعذر الوصول إلى الرابط. تأكد من نسخ Project URL بشكل صحيح.' };
  }
}

export default function SetupWizard() {
  const [sql, setSql] = useState('');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}setup.sql`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : ''))
      .then(setSql)
      .catch(() => setSql(''));
  }, []);

  const normalizedUrl = normalizeUrl(url);
  const verified = result?.ok;

  const test = async () => {
    setResult(null);
    if (!normalizedUrl) return setResult({ ok: false, message: 'الرابط غير صحيح. يجب أن يكون مثل: https://xxxx.supabase.co' });
    const keyError = checkKey(key);
    if (keyError) return setResult({ ok: false, message: keyError });
    setTesting(true);
    setResult(await testConnection(normalizedUrl, key.trim()));
    setTesting(false);
  };

  const message = `بيانات ربط نظام المهام القانونية:\nsupabaseUrl: ${normalizedUrl}\nsupabaseKey: ${key.trim()}`;

  return (
    <AuthShell wide subtitle="إعداد النظام لأول مرة" title="ربط النظام بقاعدة بيانات مجانية">
      <Alert tone="info" className="mb-6">
        يحتاج النظام قاعدة بيانات لحفظ المهام ومشاركتها بين المدير والموظفين. سنستخدم <b>Supabase</b> (مجاني). هذه الخطوات تتم مرة واحدة فقط وتستغرق حوالي 5 دقائق.
      </Alert>

      <Step number="1" title="أنشئ مشروعاً مجانياً في Supabase">
        <p>
          افتح Supabase وسجّل الدخول (يمكنك الدخول بحساب GitHub). اضغط <b>New project</b>، اكتب اسماً للمشروع، واكتب كلمة مرور لقاعدة البيانات واحتفظ بها، واختر المنطقة{' '}
          <b className="ltr">Central EU (Frankfurt)</b> لأنها الأقرب، ثم اضغط <b>Create new project</b> وانتظر دقيقتين حتى يجهز.
        </p>
        <LinkButton href={SUPABASE_NEW}>فتح Supabase</LinkButton>
      </Step>

      <Step number="2" title="جهّز قاعدة البيانات">
        <p>
          انسخ كود الإعداد، ثم افتح <b>SQL Editor</b> في مشروعك، والصق الكود واضغط <b>Run</b>. إذا ظهرت رسالة تحذير اضغط <b>Run this query</b>. يجب أن تظهر في النهاية رسالة:{' '}
          <b>تم إعداد قاعدة البيانات بنجاح ✅</b>
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={() => sql} label="نسخ كود الإعداد" copiedLabel="تم نسخ الكود" variant="primary" />
          <LinkButton href={SUPABASE_SQL}>فتح SQL Editor</LinkButton>
        </div>
        <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer font-semibold text-slate-700">عرض الكود</summary>
          <textarea readOnly value={sql} dir="ltr" className="mt-2 h-48 w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs" onFocus={(e) => e.target.select()} />
        </details>
      </Step>

      <Step number="3" title="انسخ بيانات الربط واختبرها" done={verified}>
        <p>
          <b>أولاً، الرابط:</b> وأنت داخل مشروعك في Supabase، انسخ عنوان الصفحة من شريط المتصفح (يبدأ بـ <span className="ltr">supabase.com/dashboard/project/</span>) والصقه في الخانة الأولى، والنظام يستخرج الرابط الصحيح تلقائياً.
        </p>
        <Field label="Project URL">
          {(id) => (
            <input id={id} dir="ltr" className={`${inputClass} text-left`} placeholder="https://xxxx.supabase.co أو عنوان صفحة المشروع" value={url} onChange={(e) => { setUrl(e.target.value); setResult(null); }} />
          )}
        </Field>
        <p>
          <b>ثانياً، المفتاح:</b> افتح صفحة المفاتيح واختر مشروعك، ثم انسخ المفتاح الذي اسمه <b className="ltr">Publishable key</b> ويبدأ بـ <span className="ltr">sb_publishable_</span>. لا تنسخ <b className="ltr">Secret key</b> أبداً.
        </p>
        <LinkButton href={SUPABASE_KEYS}>فتح صفحة المفاتيح</LinkButton>
        <Field label="المفتاح العام (publishable / anon)">
          {(id) => (
            <input id={id} dir="ltr" className={`${inputClass} text-left font-mono text-sm`} placeholder="sb_publishable_... أو eyJ..." value={key} onChange={(e) => { setKey(e.target.value); setResult(null); }} />
          )}
        </Field>
        <Button icon={PlugZap} loading={testing} onClick={test} disabled={!url || !key}>
          اختبار الاتصال
        </Button>
        {result && !result.ok && <Alert>{result.message}</Alert>}
        {verified && <Alert tone="success">تم الاتصال بقاعدة البيانات بنجاح وكل شيء جاهز.</Alert>}
      </Step>

      <Step number="4" title="الخطوة الأخيرة: تفعيل الرابط للجميع">
        {verified ? (
          <>
            <p>انسخ البيانات التالية وأرسلها إلى Claude في المحادثة، وسيفعّل الرابط لك ولجميع الموظفين خلال دقائق. بعدها افتح الرابط وأنشئ حساب المدير.</p>
            <pre dir="ltr" className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-left text-xs text-slate-100">{message}</pre>
            <CopyButton text={message} label="نسخ البيانات" variant="primary" />
          </>
        ) : (
          <p className="flex items-center gap-2 text-slate-500">
            <Send className="size-4" /> تظهر هنا بعد نجاح اختبار الاتصال.
          </p>
        )}
      </Step>

      <p className="flex items-start gap-2 text-xs leading-6 text-slate-500">
        <Database className="mt-1 size-4 shrink-0" />
        المفتاح العام آمن للوضع في الموقع، لأن قاعدة البيانات محمية بصلاحيات تمنع أي شخص من رؤية البيانات بدون تسجيل دخول.
      </p>
    </AuthShell>
  );
}
