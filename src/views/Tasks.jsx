import { useMemo, useState } from 'react';
import { Briefcase, Inbox, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { arabicError, normalizeArabic, taskUrgency } from '../lib/format.js';
import { Button, IconButton, inputClass, useConfirm, useToast } from '../ui.jsx';
import { DueDate, StatusSelect, TaskFormModal, URGENCY_STYLES } from './taskParts.jsx';

export const STATUS_FILTERS = [
  { id: 'open', label: 'غير المنجزة' },
  { id: 'all', label: 'كل المهام' },
  { id: 'overdue', label: 'المتأخرة' },
  { id: 'soon', label: 'تنتهي خلال 24 ساعة' },
  { id: 'pending', label: 'قيد الانتظار' },
  { id: 'in_progress', label: 'قيد التنفيذ' },
  { id: 'completed', label: 'المنجزة' },
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
      message: `هل تريد حذف مهمة "${task.client_name}" نهائياً؟ لا يمكن التراجع عن الحذف.`,
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    if (error) return toast(arabicError(error), 'error');
    await refresh();
    toast('تم حذف المهمة');
  };

  const canChangeStatus = (task) => isAdmin || task.assigned_to === member.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-slate-800">{isAdmin ? 'المهام' : 'مهامي'}</h2>
        {isAdmin && (
          <Button icon={Plus} onClick={() => setEditing(null)}>
            مهمة جديدة
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-slate-400" />
          <input
            type="search"
            aria-label="بحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم العميل أو بيان المهمة..."
            className={`${inputClass} ps-9`}
          />
        </div>
        <select aria-label="تصفية حسب الحالة" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          {STATUS_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        {isAdmin && (
          <select aria-label="تصفية حسب الموظف" value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass}>
            <option value="">كل الموظفين</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-sm text-slate-500">عدد النتائج: {visible.length}</p>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-500">
          <Inbox className="size-10 text-slate-300" />
          <p>{tasks.length === 0 ? 'لا توجد مهام بعد' : 'لا توجد مهام مطابقة للبحث أو التصفية'}</p>
          {isAdmin && tasks.length === 0 && (
            <Button icon={Plus} onClick={() => setEditing(null)}>
              إضافة أول مهمة
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* الجوال: بطاقات */}
          <div className="space-y-3 md:hidden">
            {visible.map((task) => {
              const style = URGENCY_STYLES[taskUrgency(task)];
              return (
                <article key={task.id} className={`rounded-2xl border border-s-4 border-slate-200 p-4 shadow-sm ${style.row} ${style.border}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800">{task.client_name}</h3>
                      {task.case_type && <p className="text-xs font-semibold text-indigo-700">{task.case_type}</p>}
                    </div>
                    <StatusSelect task={task} supabase={supabase} onChanged={refresh} disabled={!canChangeStatus(task)} />
                  </div>
                  <p className="whitespace-pre-line text-sm text-slate-700">{task.description}</p>
                  {task.notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-500">ملاحظة: {task.notes}</p>}
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200/70 pt-3 text-sm">
                    <DueDate task={task} compact />
                    {isAdmin && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <UserRound className="size-4 text-slate-400" />
                        {memberName[task.assigned_to] || '—'}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" icon={Pencil} onClick={() => setEditing(task)} className="flex-1">
                        تعديل
                      </Button>
                      <Button variant="secondary" icon={Trash2} onClick={() => remove(task)} className="flex-1 text-red-600">
                        حذف
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* الشاشات الكبيرة: جدول */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-bold">العميل</th>
                  <th className="px-4 py-3 font-bold">بيان المهمة</th>
                  {isAdmin && <th className="px-4 py-3 font-bold">المكلف</th>}
                  <th className="px-4 py-3 font-bold">موعد الانتهاء</th>
                  <th className="px-4 py-3 font-bold">الحالة</th>
                  {isAdmin && <th className="px-4 py-3 font-bold">إجراءات</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((task) => {
                  const style = URGENCY_STYLES[taskUrgency(task)];
                  return (
                    <tr key={task.id} className={`border-t border-slate-100 align-top ${style.row}`}>
                      <td className={`border-s-4 px-4 py-3 ${style.border}`}>
                        <div className="font-bold text-slate-800">{task.client_name}</div>
                        {task.case_type && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            <Briefcase className="size-3" />
                            {task.case_type}
                          </div>
                        )}
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <div className="whitespace-pre-line text-slate-700">{task.description}</div>
                        {task.notes && <div className="mt-1 whitespace-pre-line text-xs text-slate-500">ملاحظة: {task.notes}</div>}
                      </td>
                      {isAdmin && <td className="px-4 py-3 text-slate-700">{memberName[task.assigned_to] || '—'}</td>}
                      <td className="px-4 py-3">
                        <DueDate task={task} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect task={task} supabase={supabase} onChanged={refresh} disabled={!canChangeStatus(task)} />
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <IconButton icon={Pencil} label="تعديل" onClick={() => setEditing(task)} className="text-indigo-700 hover:bg-indigo-50" />
                            <IconButton icon={Trash2} label="حذف" onClick={() => remove(task)} className="text-red-600 hover:bg-red-50" />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
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
