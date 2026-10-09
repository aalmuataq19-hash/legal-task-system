import { useMemo } from 'react';
import { AlarmClock, CircleCheck, Clock, Hourglass, ListTodo, Plus, TriangleAlert, UserRound } from 'lucide-react';
import { taskUrgency } from '../lib/format.js';
import { Button } from '../ui.jsx';
import { DueDate, URGENCY_STYLES } from './taskParts.jsx';

function StatCard({ label, value, icon: Icon, tone, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div>
        <p className="text-3xl font-extrabold text-slate-800">{value}</p>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
      </div>
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="size-5" />
      </div>
    </button>
  );
}

function TaskMini({ task, assigneeName, onClick }) {
  const style = URGENCY_STYLES[taskUrgency(task)];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-wrap items-start justify-between gap-3 rounded-xl border border-s-4 border-slate-200 p-3 text-right transition hover:shadow-sm ${style.row} ${style.border}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-800">{task.client_name}</p>
        <p className="line-clamp-2 text-sm text-slate-600">{task.description}</p>
        {assigneeName && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <UserRound className="size-3" /> {assigneeName}
          </p>
        )}
      </div>
      <div className="text-sm">
        <DueDate task={task} compact />
      </div>
    </button>
  );
}

export default function Dashboard({ member, isAdmin, tasks, members, onOpenTasks }) {
  const stats = useMemo(() => {
    const s = { total: tasks.length, open: 0, inProgress: 0, overdue: 0, soon: 0, completed: 0 };
    for (const t of tasks) {
      const u = taskUrgency(t);
      if (t.status === 'completed') s.completed++;
      else s.open++;
      if (t.status === 'in_progress') s.inProgress++;
      if (u === 'overdue') s.overdue++;
      if (u === 'soon') s.soon++;
    }
    return s;
  }, [tasks]);

  const memberName = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);
  const open = useMemo(() => tasks.filter((t) => t.status !== 'completed').sort((a, b) => new Date(a.due_at) - new Date(b.due_at)), [tasks]);
  const urgent = open.filter((t) => ['overdue', 'soon'].includes(taskUrgency(t))).slice(0, 6);
  const upcoming = open.filter((t) => taskUrgency(t) === 'normal').slice(0, 6);

  const workload = useMemo(
    () =>
      members
        .map((m) => {
          const mine = tasks.filter((t) => t.assigned_to === m.id);
          return {
            ...m,
            open: mine.filter((t) => t.status !== 'completed').length,
            overdue: mine.filter((t) => taskUrgency(t) === 'overdue').length,
            completed: mine.filter((t) => t.status === 'completed').length,
          };
        })
        .filter((m) => (m.active && m.role === 'employee') || m.open > 0),
    [members, tasks],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">مرحباً، {member.name}</h2>
          <p className="text-sm text-slate-500">ملخص {isAdmin ? 'مهام المكتب' : 'مهامك'}</p>
        </div>
        {isAdmin && (
          <Button icon={Plus} onClick={() => onOpenTasks({ openNew: true })}>
            مهمة جديدة
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="غير منجزة" value={stats.open} icon={ListTodo} tone="bg-indigo-100 text-indigo-700" onClick={() => onOpenTasks({ status: 'open' })} />
        <StatCard label="متأخرة" value={stats.overdue} icon={TriangleAlert} tone="bg-red-100 text-red-700" onClick={() => onOpenTasks({ status: 'overdue' })} />
        <StatCard label="خلال 24 ساعة" value={stats.soon} icon={AlarmClock} tone="bg-amber-100 text-amber-700" onClick={() => onOpenTasks({ status: 'soon' })} />
        <StatCard label="قيد التنفيذ" value={stats.inProgress} icon={Clock} tone="bg-sky-100 text-sky-700" onClick={() => onOpenTasks({ status: 'in_progress' })} />
        <StatCard label="منجزة" value={stats.completed} icon={CircleCheck} tone="bg-emerald-100 text-emerald-700" onClick={() => onOpenTasks({ status: 'completed' })} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
            <TriangleAlert className="size-5 text-red-500" /> تحتاج انتباهاً عاجلاً
          </h3>
          {urgent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">لا توجد مهام متأخرة أو قريبة الانتهاء 👍</p>
          ) : (
            <div className="space-y-2">
              {urgent.map((t) => (
                <TaskMini key={t.id} task={t} assigneeName={isAdmin && memberName[t.assigned_to]} onClick={() => onOpenTasks({ status: taskUrgency(t) })} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
            <Hourglass className="size-5 text-indigo-500" /> المهام القادمة
          </h3>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">لا توجد مهام قادمة</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t) => (
                <TaskMini key={t.id} task={t} assigneeName={isAdmin && memberName[t.assigned_to]} onClick={() => onOpenTasks({ status: 'open' })} />
              ))}
            </div>
          )}
        </section>
      </div>

      {isAdmin && workload.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-bold text-slate-800">توزيع المهام على الفريق</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {workload.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpenTasks({ status: 'open', assignee: m.id })}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-right hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-700">
                  {m.name}
                  {!m.active && <span className="ms-1 text-xs font-bold text-red-600">(معطّل)</span>}
                </span>
                <span className="flex gap-2 text-xs font-bold">
                  <span className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-700">{m.open} مفتوحة</span>
                  {m.overdue > 0 && <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">{m.overdue} متأخرة</span>}
                  <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{m.completed} منجزة</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
