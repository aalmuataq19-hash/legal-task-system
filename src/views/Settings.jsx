import { useRef, useState } from 'react';
import { Building2, ImageUp, KeyRound, Save, Trash2, UserRound } from 'lucide-react';
import { ROLE_LABELS, arabicError } from '../lib/format.js';
import { Alert, Button, Card, Field, PageHeader, inputClass, useToast } from '../ui.jsx';
import { OfficeMark } from '../screens/AuthShell.jsx';
import { BRAND } from '../brand.jsx';
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
    <Card as="section" className="p-6 sm:p-8">
      <SectionTitle icon={Building2} title="بيانات المكتب" hint="تظهر في أعلى النظام وفي صفحة الدخول لجميع الموظفين. اتركها فارغة لاستخدام اسم الشركة وشعارها الرسميين." />
      <div className="space-y-6">
        <Field label="اسم المكتب">
          {(id) => <input id={id} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={BRAND.name} maxLength={120} />}
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">شعار مخصص <span className="text-mute">(اختياري، يحل محل رمز الشركة)</span></p>
          <div className="flex flex-wrap items-center gap-4">
            <OfficeMark settings={{ logo }} size="lg" />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} aria-label="رفع الشعار" />
            <Button variant="secondary" icon={ImageUp} onClick={() => fileRef.current?.click()}>
              {logo ? 'تغيير الشعار' : 'رفع شعار'}
            </Button>
            {logo && (
              <Button variant="ghost" icon={Trash2} onClick={() => setLogo(null)} className="text-copper">
                إزالة
              </Button>
            )}
          </div>
        </div>
        {error && <Alert>{error}</Alert>}
        <div className="border-t border-line pt-6">
          <Button icon={Save} loading={saving} disabled={!dirty} onClick={save}>
            حفظ
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title, hint }) {
  return (
    <div className="mb-7 flex items-start gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-deep">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div>
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-sm leading-7 text-mute">{hint}</p>}
      </div>
    </div>
  );
}

export default function Settings({ supabase, member, isAdmin, settings, onSettingsChange }) {
  const toast = useToast();
  const [changing, setChanging] = useState(false);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="الإعدادات" subtitle={isAdmin ? 'بيانات المكتب وحسابك الشخصي' : 'حسابك الشخصي'} />
      <div className="space-y-6">
        {isAdmin && <OfficeSettings supabase={supabase} settings={settings} onSettingsChange={onSettingsChange} />}
        <Card as="section" className="p-6 sm:p-8">
          <SectionTitle icon={UserRound} title="حسابي" />
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-sm">
            <dt className="text-mute">الاسم</dt>
            <dd className="font-medium text-ink">{member.name}</dd>
            <dt className="text-mute">البريد</dt>
            <dd className="ltr text-right font-medium text-ink">{member.email}</dd>
            <dt className="text-mute">الصلاحية</dt>
            <dd className="font-medium text-ink">{ROLE_LABELS[member.role]}</dd>
          </dl>
          <div className="mt-7 border-t border-line pt-6">
            {changing ? (
              <div className="fade">
                <h4 className="mb-4 font-semibold text-ink">تغيير كلمة المرور</h4>
                <ChangePasswordForm
                  supabase={supabase}
                  onDone={() => {
                    setChanging(false);
                    toast('تم تغيير كلمة المرور');
                  }}
                />
                <Button variant="ghost" onClick={() => setChanging(false)} className="mt-2 w-full">
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button variant="outline" icon={KeyRound} onClick={() => setChanging(true)}>
                تغيير كلمة المرور
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
