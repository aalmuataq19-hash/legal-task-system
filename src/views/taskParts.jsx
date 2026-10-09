import { useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import {
  CASE_TYPES,
  STATUS_LABELS,
  arabicError,
  formatDate,
  formatHijri,
  formatRelative,
  formatShortDate,
  formatTime,
  fromLocalInput,
  taskUrgency,
  toLocalInput,
} from '../lib/format.js';
import { Alert, Button, Field, Modal, Tag, inputClass, useToast } from '../ui.jsx';

// ألوان الحالة الزمنية محصورة في وسوم صغيرة وخط رفيع، بلا تلوين للخلفيات
export const URGENCY = {
  overdue: { tone: 'copper', label: 'متأخرة', rule: 'border-s-copper/70', text: 'text-copper' },
  soon: { tone: 'amber', label: 'خلال ٢٤ ساعة', rule: 'border-s-amber/70', text: 'text-amber' },
  completed: { tone: 'acc', label: 'منجزة', rule: 'border-s-line', text: 'text-acc' },
  normal: { tone: null, label: '', rule: 'border-s-line', text: 'text-mute' },
};

export function UrgencyTag({ task }) {
  const u = URGENCY[taskUrgency(task)];
  return u.tone ? <Tag tone={u.tone}>{u.label}</Tag> : null;
}

// سطر الموعد المختصر: التاريخ والوقت، ثم الوقت المتبقي
export function DueLine({ task }) {
  const urgency = taskUrgency(task);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span className="inline-flex items-center gap-1.5">
        <CalendarClock className="size-3.5 shrink-0" strokeWidth={1.75} />
        {formatShortDate(task.due_at)} · {formatTime(task.due_at)}
      </span>
      {urgency !== 'completed' && <span className={URGENCY[urgency].text}>{formatRelative(task.due_at)}</span>}
    </span>
  );
}

// الموعد كاملاً بالميلادي والهجري، يظهر في التفاصيل
export function DueDate({ task }) {
  const hijri = formatHijri(task.due_at);
  return (
    <div>
      <p className="font-medium text-ink">{formatDate(task.due_at)}</p>
      <p className="text-sm text-mute">
        الساعة {formatTime(task.due_at)}
        {hijri && <> · {hijri}</>}
      </p>
    </div>
  );
}

const statusSelectStyles = {
  pending: 'bg-mist text-ink-soft border-transparent',
  in_progress: 'bg-card text-acc border-acc/30',
  completed: 'bg-acc-soft text-acc border-transparent',
};

export function StatusSelect({ task, supabase, onChanged, disabled }) {
  const toast = useToast();
  const [pending, setPending] = useState(null);
  const change = async (e) => {
    const status = e.target.value;
    setPending(status);
    const { error } = await supabase.from('tasks').update({ status }).eq('id', task.id);
    if (error) {
      setPending(null);
      return toast(arabicError(error), 'error');
    }
    await onChanged();
    setPending(null);
    toast(`تم تغيير الحالة إلى: ${STATUS_LABELS[status]}`);
  };
  const value = pending ?? task.status;
  return (
    <select
      aria-label="حالة المهمة"
      value={value}
      onChange={change}
      disabled={disabled || pending !== null}
      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-acc-soft disabled:cursor-default disabled:opacity-60 ${statusSelectStyles[value]}`}
    >
      {Object.entries(STATUS_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

const emptyForm = { client_name: '', description: '', case_type: '', assigned_to: '', due_at: '', notes: '', status: 'pending' };

export function TaskFormModal({ open, task, members, supabase, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!task;
  const [form, setForm] = useState(() =>
    task
      ? {
          client_name: task.client_name,
          description: task.description,
          case_type: task.case_type || '',
          assigned_to: task.assigned_to,
          due_at: toLocalInput(task.due_at),
          notes: task.notes || '',
          status: task.status,
        }
      : emptyForm,
  );
  const [errors, setErrors] = useState({});
  const [more, setMore] = useState(editing);
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // الموظفون النشطون، مع إبقاء المكلف الحالي ظاهراً حتى لو عُطّل حسابه
  const assignable = members.filter((m) => m.active || m.id === task?.assigned_to);
  const caseTypes = form.case_type && !CASE_TYPES.includes(form.case_type) ? [...CASE_TYPES, form.case_type] : CASE_TYPES;

  const save = async (e) => {
    e?.preventDefault();
    const next = {};
    if (!form.client_name.trim()) next.client_name = 'اسم العميل مطلوب';
    if (!form.description.trim()) next.description = 'بيان المهمة مطلوب';
    if (!form.assigned_to) next.assigned_to = 'اختر الموظف المكلف';
    const dueAt = fromLocalInput(form.due_at);
    if (!dueAt) next.due_at = 'حدد تاريخ ووقت الانتهاء';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      client_name: form.client_name.trim(),
      description: form.description.trim(),
      case_type: form.case_type || null,
      assigned_to: form.assigned_to,
      due_at: dueAt,
      notes: form.notes.trim() || null,
      status: form.status,
    };
    setSaving(true);
    setServerError('');
    const { error } = editing
      ? await supabase.from('tasks').update(payload).eq('id', task.id)
      : await supabase.from('tasks').insert(payload);
    if (error) {
      setSaving(false);
      return setServerError(arabicError(error));
    }
    await onSaved();
    toast(editing ? 'تم حفظ التعديلات' : 'تمت إضافة المهمة');
    onClose();
  };

  return (
    <Modal
      open={open}
      wide
      title={editing ? 'تعديل المهمة' : 'مهمة جديدة'}
      onClose={onClose}
      footer={
        <>
          <Button icon={Save} loading={saving} onClick={save} className="flex-1">
            {editing ? 'حفظ التعديلات' : 'حفظ المهمة'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            إلغاء
          </Button>
        </>
      }
    >
      <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Field label="اسم العميل" required error={errors.client_name}>
          {(id) => <input id={id} className={inputClass} value={form.client_name} onChange={set('client_name')} placeholder="مثال: شركة الأمل التجارية" />}
        </Field>
        <Field label="نوع القضية">
          {(id) => (
            <select id={id} className={inputClass} value={form.case_type} onChange={set('case_type')}>
              <option value="">— اختر —</option>
              {caseTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="بيان المهمة" required error={errors.description} className="sm:col-span-2">
          {(id) => <textarea id={id} rows={3} className={`${inputClass} leading-8`} value={form.description} onChange={set('description')} placeholder="وصف واضح للمهمة المطلوبة" />}
        </Field>
        <Field label="المكلف بالمهمة" required error={errors.assigned_to}>
          {(id) => (
            <select id={id} className={inputClass} value={form.assigned_to} onChange={set('assigned_to')}>
              <option value="">— اختر الموظف —</option>
              {assignable.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.role === 'admin' ? ' (مدير)' : ''}
                  {!m.active ? ' (معطّل)' : ''}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="موعد الانتهاء" required error={errors.due_at}>
          {(id) => <input id={id} type="datetime-local" className={inputClass} value={form.due_at} onChange={set('due_at')} />}
        </Field>
        {more ? (
          <>
            <Field label="الحالة">
              {(id) => (
                <select id={id} className={inputClass} value={form.status} onChange={set('status')}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="ملاحظات" className="sm:col-span-2">
              {(id) => <textarea id={id} rows={3} className={`${inputClass} leading-8`} value={form.notes} onChange={set('notes')} placeholder="أي تفاصيل إضافية (اختياري)" />}
            </Field>
          </>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="justify-self-start text-sm font-medium text-acc underline-offset-4 hover:underline sm:col-span-2">
            + إضافة ملاحظات أو تغيير الحالة
          </button>
        )}
        {serverError && <Alert className="sm:col-span-2">{serverError}</Alert>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
