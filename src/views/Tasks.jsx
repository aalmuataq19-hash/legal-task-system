import { useMemo, useState } from 'react';
import { Briefcase, ChevronDown, Inbox, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { arabicError, formatDate, normalizeArabic, num, taskUrgency } from '../lib/format.js';
import { Button, PageHeader, inputClass, useConfirm, useToast } from '../ui.jsx';
import { DueDate, DueLine, StatusSelect, TaskFormModal, URGENCY, UrgencyTag } from './taskParts.jsx';

export const STATUS_FILTERS = [
  { id: 'open', label: 'المفتوحة' },
  { id: 'overdue', label: 'المتأخرة' },
  { id: 'soon', label: 'خلال ٢٤ ساعة' },
  { id: 'in_progress', label: 'قيد التنفيذ' },
  { id: 'completed', label: 'المنجزة' },
  { id: 'all', label: 'الكل' },
];

function matchesStatus(task, filter) {
  const urgency = taskUrgency(task);
  switch (filter) {
    case 'all':
      return true;
    case 'open':
      return task.status !== 'completed';
    case 'overdue':
      return urgency === 'overdue';
    case 'soon':
      return urgency === 'soon';
    default:
      return task.status === filter;
  }
}

function TaskItem({ task, assigneeName, isAdmin, canChangeStatus, supabase, onChanged, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const urgency = URGENCY[taskUrgency(task)];
  const done = task.status === 'completed';
  return (
    <article className={`rounded-xl border border-line border-s-2 bg-card transition-shadow duration-300 hover:shadow-[0_2px_10px_rgba(26,26,26,0.04)] ${urgency.rule}`}>
      <div className="flex items-start gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`font-semibold ${done ? 'text-ink-soft' : 'text-ink'}`}>{task.client_name}</h3>
            <UrgencyTag task={task} />
          </div>
          <p className={`mt-1 leading-8 ${open ? 'whitespace-pre-line' : 'line-clamp-2'} ${done ? 'text-mute' : 'text-ink-soft'}`}>{task.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-mute">
            <DueLine task={task} />
            {isAdmin && (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-3.5" strokeWidth={1.75} />
                {assigneeName || '—'}
              </span>
            )}
            {task.case_type && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="size-3.5" strokeWidth={1.75} />
                {task.case_type}
              </span>
            )}
          </div>
        </div>
        <StatusSelect task={task} supabase={supabase} onChanged={onChanged} disabled={!canChangeStatus} />
      </div>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2 text-xs text-mute transition-colors hover:text-ink"
      >
        {open ? 'إخفاء التفاصيل' : 'التفاصيل'}
        <ChevronDown className={`size-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>

      {open && (
        <div className="fade space-y-5 border-t border-line px-5 py-5 text-sm">
          <div>
            <p className="mb-1 text-xs text-mute">موعد الانتهاء</p>
            <DueDate task={task} />
          </div>
          {task.notes && (
            <div className="rounded-lg bg-paper p-3.5">
              <p className="mb-1 text-xs text-mute">ملاحظات</p>
              <p className="whitespace-pre-line leading-8 text-ink-soft">{task.notes}</p>
            </div>
          )}
          <p className="text-xs text-mute">
            أُضيفت في {formatDate(task.created_at)}
            {task.completed_at && <> · أُنجزت في {formatDate(task.completed_at)}</>}
          </p>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" icon={Pencil} onClick={onEdit}>
                تعديل
              </Button>
              <Button variant="dangerQuiet" icon={Trash2} onClick={onDelete}>
                حذف
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function Tasks({ supabase, member, isAdmin, tasks, members, refresh, initialFilter }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialFilter?.status || 'open');
  const [assignee, setAssignee] = useState(initialFilter?.assignee || '');
  const [editing, setEditing] = useState(initialFilter?.openNew && isAdmin ? null : undefined);

  const memberName = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);

  const visible = useMemo(() => {
    const q = normalizeArabic(search.trim());
    return tasks
      .filter((t) => matchesStatus(t, status))
      .filter((t) => !assignee || t.assigned_to === assignee)
      .filter(
        (t) =>
          !q ||
          normalizeArabic([t.client_name, t.description, t.notes, t.case_type, memberName[t.assigned_to]].join(' ')).includes(q),
      )
      .sort((a, b) => {
        const doneA = a.status === 'completed';
        const doneB = b.status === 'completed';
        if (doneA !== doneB) return doneA ? 1 : -1;
        if (doneA) return new Date(b.completed_at || b.due_at) - new Date(a.completed_at || a.due_at);
        return new Date(a.due_at) - new Date(b.due_at);
      });
  }, [tasks, status, assignee, search, memberName]);

  const remove = async (task) => {
    const ok = await confirm({
      title: 'حذف المهمة',
      message: `هل تريد حذف مهمة «${task.client_name}» نهائياً؟ لا يمكن التراجع عن الحذف.`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) return toast(arabicError(error), 'error');
    await refresh();
    toast('تم حذف المهمة');
  };

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'المهام' : 'مهامي'}
        subtitle={tasks.length ? `يُعرض ${num(visible.length)} من أصل ${num(tasks.length)}` : 'لا توجد مهام بعد'}
        action={
          isAdmin && (
            <Button icon={Plus} onClick={() => setEditing(null)}>
              مهمة جديدة
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-mute" strokeWidth={1.75} />
          <input
            type="search"
            aria-label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم العميل أو بيان المهمة…"
            className={`${inputClass} ps-10`}
          />
        </div>
        {isAdmin && (
          <select aria-label="تصفية حسب الموظف" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={`${inputClass} sm:w-56`}>
            <option value="">كل الموظفين</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div role="radiogroup" aria-label="تصفية حسب الحالة" className="no-scrollbar -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setStatus(f.id)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors duration-200 ${active ? 'border-acc bg-acc text-paper' : 'border-line bg-card text-ink-soft hover:border-line-strong'}`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-line-strong py-16 text-center">
          <Inbox className="size-8 text-line-strong" strokeWidth={1.5} />
          <p className="text-mute">{tasks.length === 0 ? 'لا توجد مهام بعد' : 'لا توجد مهام مطابقة للبحث أو التصفية'}</p>
          {isAdmin && tasks.length === 0 && (
            <Button icon={Plus} onClick={() => setEditing(null)}>
              إضافة أول مهمة
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              assigneeName={memberName[task.assigned_to]}
              isAdmin={isAdmin}
              canChangeStatus={isAdmin || task.assigned_to === member.id}
              supabase={supabase}
              onChanged={refresh}
              onEdit={() => setEditing(task)}
              onDelete={() => remove(task)}
            />
          ))}
        </div>
      )}

      {editing !== undefined && (
        <TaskFormModal
          key={editing?.id ?? 'new'}
          open
          task={editing}
          members={members}
          supabase={supabase}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
