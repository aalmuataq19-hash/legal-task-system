import { useRef, useState } from 'react';
import { Building2, ImageUp, Save, Trash2, UserRound } from 'lucide-react';
import { ROLE_LABELS, arabicError } from '../lib/format.js';
import { Alert, Button, Field, inputClass, useToast } from '../ui.jsx';
import { OfficeMark } from '../screens/AuthShell.jsx';
import { ChangePasswordForm } from '../screens/AccountScreens.jsx';

const MAX_LOGO_SIDE = 320;
const MAX_LOGO_LENGTH = 380_000;

// تصغير الشعار في المتصفح قبل حفظه حتى يبقى خفيفاً
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_LOGO_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let data = canvas.toDataURL('image/png');
      if (data.length > MAX_LOGO_LENGTH) data = canvas.toDataURL('image/webp', 0.85);
      if (data.length > MAX_LOGO_LENGTH) data = canvas.toDataURL('image/jpeg', 0.8);
      if (data.length > MAX_LOGO_LENGTH) reject(new Error('الصورة كبيرة جداً'));
      else resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذر قراءة الصورة'));
    };
    img.src = url;
  });
}

function OfficeSettings({ supabase, settings, onSettingsChange }) {
  const toast = useToast();
  const fileRef = useRef();
  const [name, setName] = useState(settings.office_name || '');
  const [logo, setLogo] = useState(settings.logo || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== (settings.office_name || '') || logo !== (settings.logo || null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) return setError('اختر ملف صورة (PNG أو JPG)');
    try {
      setLogo(await resizeImage(file));
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error: updateError } = await supabase
      .from('settings')
      .update({ office_name: name.trim() || null, logo })
      .eq('id', 1)
      .select('office_name, logo')
      .single();
    setSaving(false);
    if (updateError) return setError(arabicError(updateError));
    onSettingsChange(data);
    toast('تم حفظ إعدادات المكتب');
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
        <Building2 className="size-5 text-indigo-600" /> بيانات المكتب
      </h3>
      <div className="space-y-4">
        <Field label="اسم المكتب" hint="يظهر في أعلى النظام وفي صفحة الدخول">
          {(id) => <input id={id} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مكتب العدالة للمحاماة" maxLength={120} />}
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">شعار المكتب (اختياري)</p>
          <div className="flex flex-wrap items-center gap-3">
            <OfficeMark settings={{ logo }} className="size-20" />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} aria-label="رفع الشعار" />
            <Button variant="secondary" icon={ImageUp} onClick={() => fileRef.current?.click()}>
              {logo ? 'تغيير الشعار' : 'رفع شعار'}
            </Button>
            {logo && (
              <Button variant="ghost" icon={Trash2} onClick={() => setLogo(null)} className="text-red-600">
                إزالة
              </Button>
            )}
          </div>
        </div>
        {error && <Alert>{error}</Alert>}
        <Button icon={Save} loading={saving} disabled={!dirty} onClick={save}>
          حفظ
        </Button>
      </div>
    </section>
  );
}

export default function Settings({ supabase, member, isAdmin, settings, onSettingsChange }) {
  const toast = useToast();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-extrabold text-slate-800">الإعدادات</h2>
      {isAdmin && <OfficeSettings supabase={supabase} settings={settings} onSettingsChange={onSettingsChange} />}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
          <UserRound className="size-5 text-indigo-600" /> حسابي
        </h3>
        <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">الاسم</dt>
          <dd className="font-semibold">{member.name}</dd>
          <dt className="text-slate-500">البريد</dt>
          <dd className="ltr text-right font-semibold">{member.email}</dd>
          <dt className="text-slate-500">الصلاحية</dt>
          <dd className="font-semibold">{ROLE_LABELS[member.role]}</dd>
        </dl>
        <h4 className="mb-3 font-bold text-slate-700">تغيير كلمة المرور</h4>
        <ChangePasswordForm supabase={supabase} onDone={() => toast('تم تغيير كلمة المرور')} />
      </section>
    </div>
  );
}
