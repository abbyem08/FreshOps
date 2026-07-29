// pages/login.js
// Staff login — separate from the customer portal (/portal/login).
// After signing in, checks the `users` table to confirm this account is
// actually set up as staff before letting them into the internal app.
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function StaffLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setLoading(false); setError('Email or password not recognized.'); return; }

    const { data: staffRow } = await supabase.from('users').select('*').eq('user_id', data.user.id).single();
    setLoading(false);
    if (!staffRow) {
      setError("This login isn't set up as a staff account yet. See SETUP-GUIDE.md — you need one row added to the `users` table linking this login to a staff profile.");
      return;
    }
    router.push('/app/orders');
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>FreshOps</h1>
        <p style={styles.sub}>Staff Sign In</p>
        <form onSubmit={handleLogin} style={{ marginTop: 24 }}>
          <label style={styles.label}>Email
            <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label style={styles.label}>Password
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.button} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F4EC', fontFamily: 'sans-serif' },
  card: { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 10, padding: 32, width: 340 },
  title: { color: '#2F5233', margin: 0, fontSize: 24 },
  sub: { color: '#78716c', margin: '4px 0 0' },
  label: { display: 'block', fontSize: 13, marginBottom: 12, color: '#333' },
  input: { display: 'block', width: '100%', padding: '8px 10px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 6, fontSize: 14 },
  button: { width: '100%', padding: '10px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', marginTop: 8 },
  error: { color: '#C0562D', fontSize: 13, marginBottom: 12, lineHeight: 1.4 },
};
