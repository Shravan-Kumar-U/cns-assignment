import { useState } from 'react';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Enter a name to continue.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{2,20}$/.test(trimmed)) {
      setError('Use 2-20 letters, numbers, - or _ only.');
      return;
    }
    onLogin(trimmed.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <ShieldCheck size={24} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PGP / S-MIME Demo</h1>
          <p className="text-sm text-slate-500 mt-2">
            Enter a name to open your personal dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl"
        >
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Your name
          </label>
          <input
            autoFocus
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            placeholder="e.g. alice"
            className="w-full bg-slate-950 text-white text-sm p-3 mt-2 rounded-lg border border-slate-800 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-400 mt-3 animate-fade-in">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors mt-5"
          >
            <LogIn size={15} /> Enter dashboard
          </button>
        </form>

        <p className="text-xs text-slate-600 text-center mt-5 leading-relaxed">
          Tip: open a second tab and log in as a different name (e.g. "bob") to
          try sending an encrypted message between two users.
        </p>
      </div>
    </div>
  );
}

export default Login;
