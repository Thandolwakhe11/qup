import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import Login from './Login';
import Dashboard from './Dashboard';
import Demo from './Demo';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isDemo, setIsDemo] = useState(window.location.hash === '#demo');

  useEffect(() => {
    const onHash = () => setIsDemo(window.location.hash === '#demo');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (isDemo) return <Demo />;
  if (!ready) return <p className="center">Loading…</p>;
  return session ? <Dashboard /> : <Login />;
}