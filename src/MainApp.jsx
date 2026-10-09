import { useCallback, useEffect, useState } from 'react';
import { House, ListChecks, LogOut, RefreshCw, Settings as SettingsIcon, Users } from 'lucide-react';
import { fetchAll } from './lib/supabase.js';
import { ROLE_LABELS, arabicError } from './lib/format.js';
import { Alert, IconButton, Spinner, useConfirm } from './ui.jsx';
import { OfficeMark } from './screens/AuthShell.jsx';
import Dashboard from './views/Dashboard.jsx';
import Tasks from './views/Tasks.jsx';
import Employees from './views/Employees.jsx';
import Settings from './views/Settings.jsx';

const REFRESH_MS = 60_000;

export default function MainApp({ supabase, member, settings, onSettingsChange, onMemberChange, onSignOut }) {
  const isAdmin = member.role === 'admin';
  const confirm = useConfirm();
  const [view, setView] = useState('dashboard');
  const [taskFilter, setTaskFilter] = useState({ status: 'open', openNew: false });
  const [tasks, setTasks] = useState(null);
  const [members, setMembers] = useState([member]);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [taskRows, memberRows] = await Promise.all([
        fetchAll(() => supabase.from('tasks').select('*').order('due_at').order('id')),
        fetchAll(() => supabase.from('members').select('*').order('created_at').order('id')),
      ]);
      setTasks(taskRows);
      setMembers(memberRows);
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    } finally {
      setRefreshing(false);
    }
  }, [supabase]);

  // تحديث تلقائي كل دقيقة، وعند العودة للصفحة
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const openTasks = (filter = {}) => {
    setTaskFilter({ status: 'open', openNew: false, ...filter, key: Date.now() });
    setView('tasks');
    window.scrollTo({ top: 0 });
  };

  const signOut = async () => {
    if (await confirm({ title: 'تسجيل الخروج', message: 'هل تريد تسجيل الخروج من النظام؟', confirmLabel: 'خروج' })) onSignOut();
  };

  const nav = [
    { id: 'dashboard', label: 'الرئيسية', icon: House },
    { id: 'tasks', label: 'المهام', icon: ListChecks },
    ...(isAdmin ? [{ id: 'employees', label: 'الموظفون', icon: Users }] : []),
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  const shared = { supabase, member, isAdmin, tasks: tasks ?? [], members, refresh, onMemberChange };

  return (
    <div className="min-h-dvh pb-28 md:pb-20">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <OfficeMark settings={settings} size="md" />
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-[15px] font-bold text-ink">{settings.office_name || 'المهام القانونية'}</h1>
              <p className="mt-0.5 truncate text-xs text-mute">
                {member.name} · {ROLE_LABELS[member.role]}
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-lg bg-mist p-1 md:flex" aria-label="التنقل">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={view === item.id ? 'page' : undefined}
                onClick={() => (item.id === 'tasks' ? openTasks() : setView(item.id))}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm transition-colors duration-200 ${view === item.id ? 'bg-card font-semibold text-ink shadow-[0_1px_2px_rgba(26,26,26,0.06)]' : 'text-mute hover:text-ink'}`}
              >
                <item.icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <IconButton
              icon={refreshing ? Spinner : RefreshCw}
              label="تحديث"
              onClick={refresh}
              className="border border-line text-mute hover:bg-card hover:text-ink"
            />
            <IconButton icon={LogOut} label="تسجيل الخروج" onClick={signOut} className="border border-line text-mute hover:bg-card hover:text-copper" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-8 sm:px-8 sm:pt-12">
        {loadError && (
          <Alert className="mb-6">
            {arabicError(loadError)}{' '}
            <button type="button" onClick={refresh} className="font-semibold underline underline-offset-4">
              إعادة المحاولة
            </button>
          </Alert>
        )}
        {tasks === null && !loadError ? (
          <div className="flex justify-center py-24">
            <Spinner className="size-6" />
          </div>
        ) : (
          <div key={view} className="fade">
            {view === 'dashboard' && <Dashboard {...shared} onOpenTasks={openTasks} />}
            {view === 'tasks' && <Tasks key={taskFilter.key} {...shared} initialFilter={taskFilter} />}
            {view === 'employees' && isAdmin && <Employees {...shared} />}
            {view === 'settings' && <Settings {...shared} settings={settings} onSettingsChange={onSettingsChange} />}
          </div>
        )}
      </main>

      <nav
        aria-label="التنقل"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {nav.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => (item.id === 'tasks' ? openTasks() : setView(item.id))}
              className={`relative flex flex-1 flex-col items-center gap-1 pb-2 pt-3 text-[11px] transition-colors duration-200 ${active ? 'font-semibold text-acc' : 'text-mute'}`}
            >
              <span className={`absolute top-0 h-0.5 w-8 rounded-full transition-colors duration-200 ${active ? 'bg-acc' : 'bg-transparent'}`} />
              <item.icon className="size-5" strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
