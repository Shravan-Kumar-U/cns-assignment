import { useState, useEffect } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import Login from './components/Login';
import KeyPanel from './components/KeyPanel';
import Compose from './components/Compose';
import Inbox from './components/Inbox';
import { api } from './lib/api';

// sessionStorage (not localStorage) is deliberate: it is scoped to a single
// browser TAB, not the whole browser. Opening a second tab and logging in
// as a different name gives you a second, independent identity for free --
// that's how "two dashboards" works without building real authentication.
const USERNAME_KEY = 'pgp_username';
const KEYS_KEY = 'pgp_keys';

function StepDot({ active, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-400' : 'bg-slate-700'}`} />
      <span className={`text-xs font-medium ${active ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
    </div>
  );
}

function App() {
  const [username, setUsername] = useState(() => sessionStorage.getItem(USERNAME_KEY) || '');
  const [keys, setKeys] = useState(() => {
    const raw = sessionStorage.getItem(KEYS_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (username) sessionStorage.setItem(USERNAME_KEY, username);
  }, [username]);

  useEffect(() => {
    if (keys) sessionStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  }, [keys]);

  const handleLogin = (name) => setUsername(name);

  const handleLogout = () => {
    sessionStorage.removeItem(USERNAME_KEY);
    sessionStorage.removeItem(KEYS_KEY);
    setUsername('');
    setKeys(null);
  };

  if (!username) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 px-4 py-10">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-400" />
            <span className="text-sm text-slate-400">Logged in as</span>
            <span className="text-sm font-semibold text-white font-mono">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors"
          >
            <LogOut size={13} /> Switch user
          </button>
        </div>

        <div className="flex flex-col items-center text-center mb-3 mt-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            PGP / S-MIME Hybrid Encryption
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            AES-256-GCM + RSA-OAEP + RSA signatures · multi-user demo
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 mb-8">
          <StepDot active={!!keys} label="Keys" />
          <div className="w-6 h-px bg-slate-800" />
          <StepDot active={true} label="Send" />
          <div className="w-6 h-px bg-slate-800" />
          <StepDot active={true} label="Inbox" />
        </div>

        <div className="space-y-6">
          <KeyPanel username={username} keys={keys} onKeysReady={setKeys} />
          <Compose username={username} keys={keys} />
          <Inbox username={username} keys={keys} api={api} />
        </div>

      </div>
    </div>
  );
}

export default App;
