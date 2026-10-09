import { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, ListTodo, LogOut, RefreshCw, Settings as SettingsIcon, Users } from 'lucide-react';
import { fetchAll } from './lib/supabase.js';
import { ROLE_LABELS, arabicError } from './lib/format.js';
import { Alert, Button, IconButton, Spinner, useConfirm } from './ui.jsx';
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
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'tasks', label: 'المهام', icon: ListTodo },
    ...(isAdmin ? [{ id: 'employees', label: 'الموظفون', icon: Users }] : []),
    { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
  ];

  const shared = { supabase, member, isAdmin, tasks: tasks ?? [], members, refresh, onMemberChange };

  return (
    <div className="min-h-dvh pb-24 sm:pb-8">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <OfficeMark settings={settings} className="size-11" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold text-slate-800 sm:text-lg">{settings.office_name || 'نظام إدارة المهام القانونية'}</h1>
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {member.name} · {ROLE_LABELS[member.role]}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              icon={refreshing ? Spinner : RefreshCw}
              label="تحديث"
              onClick={refresh}
              className="text-slate-500 hover:bg-slate-100"
            />
            <Button variant="ghost" icon={LogOut} onClick={signOut} aria-label="تسجيل الخروج" className="text-red-600 hover:bg-red-50">
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1 px-4 pb-2 sm:flex">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => (item.id === 'tasks' ? openTasks() : setView(item.id))}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${view === item.id ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
        {loadError && (
          <Alert className="mb-4">
            {arabicError(loadError)}{' '}
            <button type="button" onClick={refresh} className="font-bold underline">
              إعادة المحاولة
            </button>
          </Alert>
        )}
        {tasks === null && !loadError ? (
          <div className="flex justify-center py-20">
            <Spinner className="size-8" />
          </div>
        ) : (
          <>
            {view === 'dashboard' && <Dashboard {...shared} onOpenTasks={openTasks} />}
            {view === 'tasks' && <Tasks key={taskFilter.key} {...shared} initialFilter={taskFilter} />}
            {view === 'employees' && isAdmin && <Employees {...shared} />}
            {view === 'settings' && (
              <Settings {...shared} settings={settings} onSettingsChange={onSettingsChange} />
            )}
          </>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => (item.id === 'tasks' ? openTasks() : setView(item.id))}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-bold ${view === item.id ? 'text-indigo-700' : 'text-slate-500'}`}
          >
            <item.icon className="size-5" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
