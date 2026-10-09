import { useMemo, useState } from 'react';
import { ChevronDown, KeyRound, Pencil, RefreshCw, Save, Trash2, UserPlus } from 'lucide-react';
import { ROLE_LABELS, arabicError, generatePassword, num, taskUrgency } from '../lib/format.js';
import { Alert, Button, Card, CopyButton, Field, Modal, PageHeader, Tag, inputClass, useConfirm, useToast } from '../ui.jsx';

const loginLink = () => `${window.location.origin}${window.location.pathname}`;

function credentialsText({ name, email, password, reset }) {
  return [
    `مرحباً ${name}،`,
    reset ? 'تمت إعادة تعيين كلمة المرور لحسابك في نظام المهام القانونية:' : 'تم إنشاء حسابك في نظام المهام القانونية:',
    `الرابط: ${loginLink()}`,
    `البريد الإلكتروني: ${email}`,
    `كلمة المرور المؤقتة: ${password}`,
    'سيُطلب منك اختيار كلمة مرور جديدة عند أول دخول.',
  ].join('\n');
}

function CredentialsModal({ data, onClose }) {
  if (!data) return null;
  const text = credentialsText(data);
  return (
    <Modal open title={data.reset ? 'تمت إعادة تعيين كلمة المرور' : 'تم إنشاء الحساب'} onClose={onClose} footer={<CopyButton text={text} label="نسخ الرسالة" variant="primary" className="flex-1" />}>
      <p className="mb-4 text-sm leading-7 text-ink-soft">أرسل هذه البيانات للموظف (واتساب أو بريد). لن تظهر كلمة المرور مرة أخرى.</p>
      <pre className="whitespace-pre-wrap rounded-lg border border-line bg-card p-4 font-sans text-sm leading-8 text-ink">{text}</pre>
    </Modal>
  );
}

function PasswordWithGenerator({ id, value, onChange }) {
  return (
    <div className="flex gap-2">
      <input id={id} dir="ltr" className={`${inputClass} text-left font-mono`} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
      <Button variant="secondary" icon={RefreshCw} onClick={() => onChange(generatePassword())} className="shrink-0">
        توليد
      </Button>
    </div>
  );
}

function MemberFormModal({ supabase, member, self, onClose, onSaved }) {
  const editing = !!member;
  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || 'employee',
    active: member?.active ?? true,
    password: editing ? '' : generatePassword(),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const isSelf = editing && member.id === self.id;

  const save = async (e) => {
    e?.preventDefault();
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim()) return setError('الاسم مطلوب');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('البريد الإلكتروني غير صحيح');
    if (!editing && form.password.length < 8) return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    setSaving(true);
    const { error: rpcError } = editing
      ? await supabase.rpc('admin_update_member', { p_id: member.id, p_name: form.name.trim(), p_email: email, p_role: form.role, p_active: form.active })
      : await supabase.rpc('admin_create_member', { p_name: form.name.trim(), p_email: email, p_password: form.password, p_role: form.role });
    setSaving(false);
    if (rpcError) return setError(arabicError(rpcError));
    onSaved(editing ? null : { name: form.name.trim(), email, password: form.password });
  };

  return (
    <Modal
      open
      title={editing ? 'تعديل بيانات الموظف' : 'إضافة موظف'}
      onClose={onClose}
      footer={
        <>
          <Button icon={editing ? Save : UserPlus} loading={saving} onClick={save} className="flex-1">
            {editing ? 'حفظ' : 'إنشاء الحساب'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            إلغاء
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4" noValidate>
        <Field label="الاسم الكامل" required>
          {(id) => <input id={id} className={inputClass} value={form.name} onChange={set('name')} />}
        </Field>
        <Field label="البريد الإلكتروني" required hint="يستخدمه الموظف لتسجيل الدخول">
          {(id) => <input id={id} type="email" dir="ltr" inputMode="email" className={`${inputClass} text-left`} value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="نوع الحساب" hint={isSelf ? 'لا يمكنك تغيير صلاحيتك بنفسك' : 'المدير يستطيع إضافة الموظفين وتوزيع المهام'}>
          {(id) => (
            <select id={id} className={inputClass} value={form.role} onChange={set('role')} disabled={isSelf}>
              <option value="employee">{ROLE_LABELS.employee}</option>
              <option value="admin">{ROLE_LABELS.admin}</option>
            </select>
          )}
        </Field>
        {editing ? (
          <label className={`flex items-center gap-2.5 text-sm leading-7 ${isSelf ? 'text-mute' : 'text-ink-soft'}`}>
            <input
              type="checkbox"
              className="size-4 accent-acc"
              checked={form.active}
              disabled={isSelf}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            الحساب مفعّل (إلغاء التفعيل يمنع الموظف من الدخول فوراً)
          </label>
        ) : (
          <Field label="كلمة المرور المؤقتة" required hint="سيُطلب من الموظف تغييرها عند أول دخول">
            {(id) => <PasswordWithGenerator id={id} value={form.password} onChange={(password) => setForm((f) => ({ ...f, password }))} />}
          </Field>
        )}
        {error && <Alert>{error}</Alert>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ supabase, member, onClose, onDone }) {
  const [password, setPassword] = useState(generatePassword);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (password.length < 8) return setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    setSaving(true);
    const { error: rpcError } = await supabase.rpc('admin_reset_password', { p_id: member.id, p_password: password });
    setSaving(false);
    if (rpcError) return setError(arabicError(rpcError));
    onDone({ name: member.name, email: member.email, password, reset: true });
  };
  return (
    <Modal
      open
      title={`إعادة تعيين كلمة مرور: ${member.name}`}
      onClose={onClose}
      footer={
        <>
          <Button icon={KeyRound} loading={saving} onClick={save} className="flex-1">
            تعيين كلمة المرور
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            إلغاء
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-7 text-ink-soft">سيتم تسجيل خروج الموظف من جميع أجهزته، وسيُطلب منه تغيير كلمة المرور عند الدخول.</p>
        <Field label="كلمة المرور المؤقتة الجديدة">{(id) => <PasswordWithGenerator id={id} value={password} onChange={setPassword} />}</Field>
        {error && <Alert>{error}</Alert>}
      </div>
    </Modal>
  );
}

function MemberRow({ m, self, stats, onEdit, onReset, onDelete }) {
  const [open, setOpen] = useState(false);
  const isSelf = m.id === self.id;
  return (
    <article className={`px-5 py-5 ${m.active ? '' : 'bg-paper/60'}`}>
      <div className="flex items-start gap-4">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold ${m.active ? 'bg-acc-soft text-acc' : 'bg-mist text-mute'}`}>
          {m.name.trim().charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-semibold ${m.active ? 'text-ink' : 'text-mute'}`}>{m.name}</h3>
            {isSelf && <span className="text-xs text-mute">(أنت)</span>}
            {m.role === 'admin' && <Tag tone="acc">{ROLE_LABELS.admin}</Tag>}
            {!m.active && <Tag tone="copper">معطّل</Tag>}
            {m.active && m.must_change_password && <Tag>لم يسجّل دخوله بعد</Tag>}
          </div>
          <p className="ltr mt-0.5 truncate text-right text-sm text-mute">{m.email}</p>
          <p className="mt-2 text-sm text-ink-soft">
            {num(stats.open)} مفتوحة
            {stats.overdue > 0 && <span className="text-copper"> · {num(stats.overdue)} متأخرة</span>}
            <span className="text-mute"> · {num(stats.completed)} منجزة</span>
          </p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper"
        >
          إدارة
          <ChevronDown className={`size-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
        </button>
      </div>
      {open && (
        <div className="fade mt-4 flex flex-wrap gap-2 ps-15">
          <Button variant="outline" icon={Pencil} onClick={onEdit}>
            تعديل
          </Button>
          {!isSelf && (
            <>
              <Button variant="secondary" icon={KeyRound} onClick={onReset}>
                كلمة المرور
              </Button>
              <Button variant="dangerQuiet" icon={Trash2} onClick={onDelete}>
                حذف
              </Button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default function Employees({ supabase, member: self, tasks, members, refresh, onMemberChange }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(undefined);
  const [resetting, setResetting] = useState(null);
  const [credentials, setCredentials] = useState(null);

  const stats = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      const s = (map[t.assigned_to] ||= { total: 0, open: 0, overdue: 0, completed: 0 });
      s.total++;
      if (t.status === 'completed') s.completed++;
      else s.open++;
      if (taskUrgency(t) === 'overdue') s.overdue++;
    }
    return map;
  }, [tasks]);

  const sorted = [...members].sort((a, b) => Number(b.active) - Number(a.active) || (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1));

  const remove = async (m) => {
    const ok = await confirm({
      title: 'حذف الحساب',
      message: `هل تريد حذف حساب "${m.name}" نهائياً؟ إذا كان لديه مهام فالأفضل تعطيل حسابه بدلاً من الحذف.`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.rpc('admin_delete_member', { p_id: m.id });
    if (error) return toast(arabicError(error), 'error');
    toast('تم حذف الحساب');
    refresh();
  };

  return (
    <div>
      <PageHeader
        title="الموظفون"
        subtitle={`${num(members.filter((m) => m.active).length)} حساب مفعّل`}
        action={
          <Button icon={UserPlus} onClick={() => setEditing(null)}>
            إضافة موظف
          </Button>
        }
      />

      <Card className="divide-y divide-line">
        {sorted.map((m) => (
          <MemberRow
            key={m.id}
            m={m}
            self={self}
            stats={stats[m.id] || { open: 0, overdue: 0, completed: 0 }}
            onEdit={() => setEditing(m)}
            onReset={() => setResetting(m)}
            onDelete={() => remove(m)}
          />
        ))}
      </Card>

      {editing !== undefined && (
        <MemberFormModal
          supabase={supabase}
          member={editing}
          self={self}
          onClose={() => setEditing(undefined)}
          onSaved={(created) => {
            if (editing?.id === self.id) onMemberChange();
            setEditing(undefined);
            if (created) setCredentials(created);
            else toast('تم حفظ التعديلات');
            refresh();
          }}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          supabase={supabase}
          member={resetting}
          onClose={() => setResetting(null)}
          onDone={(data) => {
            setResetting(null);
            setCredentials(data);
            refresh();
          }}
        />
      )}
      <CredentialsModal data={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
