import { useMemo } from 'react';
import { ArrowLeft, Plus, UserRound } from 'lucide-react';
import { countTasks, formatDate, formatHijri, greeting, num, taskUrgency } from '../lib/format.js';
import { Button, Card, Disclosure } from '../ui.jsx';
import { DueLine, URGENCY, UrgencyTag } from './taskParts.jsx';

// جملة ملخّصة تُقرأ بدل لوحة أرقام مزدحمة
function summarySentence({ open, overdue, soon }, isAdmin) {
  if (open === 0) {
    return isAdmin ? 'لا توجد مهام مفتوحة في المكتب حالياً.' : 'لا توجد مهام مفتوحة مسندة إليك حالياً.';
  }
  const openPart = countTasks(open, { one: 'مهمة واحدة مفتوحة', two: 'مهمتان مفتوحتان', few: 'مهام مفتوحة', many: 'مهمة مفتوحة' });
  const parts = [];
  if (overdue) parts.push(overdue === 1 ? 'واحدة متأخرة' : overdue === 2 ? 'اثنتان متأخرتان' : `${num(overdue)} متأخرة`);
  if (soon) parts.push(soon === 1 ? 'واحدة تنتهي خلال ٢٤ ساعة' : `${num(soon)} تنتهي خلال ٢٤ ساعة`);
  const rest = parts.length ? `، منها ${parts.join(' و')}` : '';
  return `${isAdmin ? 'في المكتب' : 'لديك'} ${openPart}${rest}.`;
}

function Stat({ label, value, tone, onClick }) {
  const color = value > 0 && tone ? tone : 'text-ink';
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-start gap-2 bg-card px-5 py-5 text-right transition-colors duration-200 hover:bg-paper">
      <span className={`text-3xl font-semibold leading-none ${color}`}>{num(value)}</span>
      <span className="text-sm text-mute transition-colors group-hover:text-ink-soft">{label}</span>
    </button>
  );
}

function TaskLine({ task, assigneeName, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-start gap-4 border-s-2 px-5 py-4 text-right transition-colors duration-200 hover:bg-paper ${URGENCY[taskUrgency(task)].rule}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{task.client_name}</span>
          <UrgencyTag task={task} />
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-ink-soft">{task.description}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-xs text-mute">
          <DueLine task={task} />
          {assigneeName && (
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3" strokeWidth={1.75} /> {assigneeName}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Section({ title, empty, children }) {
  return (
    <section className="mt-12">
      <h3 className="mb-4 text-sm font-semibold tracking-wide text-mute">{title}</h3>
      {children ? <Card className="divide-y divide-line overflow-hidden">{children}</Card> : <p className="text-sm text-mute">{empty}</p>}
    </section>
  );
}

export default function Dashboard({ member, isAdmin, tasks, members, onOpenTasks }) {
  const stats = useMemo(() => {
    const s = { open: 0, inProgress: 0, overdue: 0, soon: 0, completed: 0 };
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
  const urgent = open.filter((t) => ['overdue', 'soon'].includes(taskUrgency(t))).slice(0, 5);
  const upcoming = open.filter((t) => taskUrgency(t) === 'normal').slice(0, 5);

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

  const now = new Date().toISOString();
  const hijri = formatHijri(now);
  const firstName = member.name.trim().split(/\s+/)[0];

  return (
    <div>
      <section className="pb-2">
        <p className="text-sm text-mute">
          {formatDate(now)}
          {hijri && <> · {hijri}</>}
        </p>
        <h2 className="mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {greeting()}، {firstName}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-9 text-ink-soft">{summarySentence(stats, isAdmin)}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {isAdmin && (
            <Button icon={Plus} onClick={() => onOpenTasks({ openNew: true })}>
              مهمة جديدة
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenTasks({ status: 'open' })}>
            {isAdmin ? 'عرض المهام' : 'عرض مهامي'}
            <ArrowLeft className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </section>

      <Card className="mt-10 overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          <Stat label="مفتوحة" value={stats.open} onClick={() => onOpenTasks({ status: 'open' })} />
          <Stat label="متأخرة" value={stats.overdue} tone="text-copper" onClick={() => onOpenTasks({ status: 'overdue' })} />
          <Stat label="خلال ٢٤ ساعة" value={stats.soon} tone="text-amber" onClick={() => onOpenTasks({ status: 'soon' })} />
          <Stat label="منجزة" value={stats.completed} tone="text-acc" onClick={() => onOpenTasks({ status: 'completed' })} />
        </div>
      </Card>

      <Section title="تحتاج انتباهك" empty="لا توجد مهام متأخرة أو قريبة الانتهاء.">
        {urgent.length > 0 &&
          urgent.map((t) => (
            <TaskLine key={t.id} task={t} assigneeName={isAdmin && memberName[t.assigned_to]} onClick={() => onOpenTasks({ status: taskUrgency(t) })} />
          ))}
      </Section>

      <Section title="القادمة" empty="لا توجد مهام قادمة.">
        {upcoming.length > 0 &&
          upcoming.map((t) => <TaskLine key={t.id} task={t} assigneeName={isAdmin && memberName[t.assigned_to]} onClick={() => onOpenTasks({ status: 'open' })} />)}
      </Section>

      {isAdmin && workload.length > 0 && (
        <Disclosure className="mt-12" title="توزيع العمل على الفريق" hint="عدد المهام المفتوحة لكل موظف">
          <ul className="divide-y divide-line">
            {workload.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onOpenTasks({ status: 'open', assignee: m.id })}
                  className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-right transition-colors hover:text-acc"
                >
                  <span className="font-medium text-ink">
                    {m.name}
                    {!m.active && <span className="ms-2 text-xs font-normal text-copper">(معطّل)</span>}
                  </span>
                  <span className="text-sm text-mute">
                    {num(m.open)} مفتوحة
                    {m.overdue > 0 && <span className="text-copper"> · {num(m.overdue)} متأخرة</span>}
                    {' · '}
                    {num(m.completed)} منجزة
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </div>
  );
}
