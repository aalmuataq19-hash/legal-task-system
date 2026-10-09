import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadConfig } from './lib/config.js';
import { createSupabase } from './lib/supabase.js';
import { arabicError } from './lib/format.js';
import { ConfirmProvider, FullScreenLoader, ToastProvider } from './ui.jsx';
import SetupWizard from './screens/SetupWizard.jsx';
import CreateAdmin from './screens/CreateAdmin.jsx';
import Login from './screens/Login.jsx';
import { ForcePasswordChange, ConnectionError, NoAccess } from './screens/AccountScreens.jsx';
import MainApp from './MainApp.jsx';

export default function App() {
  const [config, setConfig] = useState(undefined);

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const supabase = useMemo(() => (config ? createSupabase(config) : null), [config]);

  return (
    <ToastProvider>
      <ConfirmProvider>
        {config === undefined ? <FullScreenLoader /> : supabase ? <Root supabase={supabase} /> : <SetupWizard />}
      </ConfirmProvider>
    </ToastProvider>
  );
}

function Root({ supabase }) {
  const [system, setSystem] = useState(null);
  const [systemError, setSystemError] = useState(null);
  const [settings, setSettings] = useState({ office_name: null, logo: null });
  const [session, setSession] = useState(undefined);
  const [member, setMember] = useState(undefined);
  const [memberError, setMemberError] = useState(null);

  const loadSystem = useCallback(async () => {
    setSystemError(null);
    const [status, office] = await Promise.all([
      supabase.rpc('system_status'),
      supabase.from('settings').select('office_name, logo').eq('id', 1).maybeSingle(),
    ]);
    if (status.error) {
      setSystemError(status.error);
      return;
    }
    setSystem(status.data);
    if (office.data) setSettings(office.data);
  }, [supabase]);

  useEffect(() => {
    loadSystem().catch((error) => setSystemError(error));
  }, [loadSystem]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next ?? null));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const userId = session?.user?.id;

  const loadMember = useCallback(async () => {
    if (!userId) {
      setMember(null);
      return;
    }
    setMemberError(null);
    const { data, error } = await supabase.from('members').select('*').eq('id', userId).maybeSingle();
    if (error) setMemberError(error);
    else setMember(data);
  }, [supabase, userId]);

  useEffect(() => {
    setMember(undefined);
    loadMember().catch((error) => setMemberError(error));
  }, [loadMember]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
  }, [supabase]);

  if (systemError) return <ConnectionError message={arabicError(systemError)} onRetry={loadSystem} />;
  if (!system || session === undefined) return <FullScreenLoader />;
  if (!system.has_admin) return <CreateAdmin supabase={supabase} onDone={loadSystem} />;
  if (!session) return <Login supabase={supabase} settings={settings} />;
  if (memberError) return <ConnectionError message={arabicError(memberError)} onRetry={loadMember} onSignOut={signOut} />;
  if (member === undefined) return <FullScreenLoader />;
  if (!member || !member.active) return <NoAccess disabled={!!member} onSignOut={signOut} />;
  if (member.must_change_password) {
    return <ForcePasswordChange supabase={supabase} member={member} settings={settings} onDone={loadMember} onSignOut={signOut} />;
  }
  return (
    <MainApp
      supabase={supabase}
      member={member}
      settings={settings}
      onSettingsChange={setSettings}
      onMemberChange={loadMember}
      onSignOut={signOut}
    />
  );
}
