import { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import CopyButton from './CopyButton';
import { api } from '../lib/api';

function KeyPanel({ username, keys, onKeysReady }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const { publicKey, privateKey } = await api.generateKeys();
      await api.registerUser(username, publicKey);
      onKeysReady({ publicKey, privateKey });
    } catch (err) {
      setError(err.message || 'Could not reach the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <KeyRound size={18} className="text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Your keys</h2>
        {keys && <ShieldCheck size={16} className="text-emerald-400 ml-auto" />}
      </div>
      <p className="text-sm text-slate-400 mb-4 ml-12">
        Generates an RSA-2048 key pair and publishes your public key under{' '}
        <span className="font-mono text-slate-300">{username}</span> so others can message you.
      </p>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? 'Generating...' : keys ? 'Regenerate Key Pair' : 'Generate Key Pair'}
      </button>

      {keys && (
        <p className="text-xs text-amber-400/80 mt-2">
          Regenerating replaces your public key for everyone. Messages already sent to your old key can no longer be decrypted.
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400 mt-3 animate-fade-in">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {keys && (
        <div className="mt-5 space-y-4 animate-fade-in">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Public key <span className="text-slate-600">(shared, published)</span>
              </label>
              <CopyButton text={keys.publicKey} />
            </div>
            <textarea readOnly value={keys.publicKey}
              className="w-full h-24 bg-slate-950 text-emerald-400 text-xs font-mono p-3 rounded-lg border border-slate-800 resize-none" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Private key <span className="text-slate-600">(kept only in this tab)</span>
              </label>
              <CopyButton text={keys.privateKey} />
            </div>
            <textarea readOnly value={keys.privateKey}
              className="w-full h-24 bg-slate-950 text-rose-400 text-xs font-mono p-3 rounded-lg border border-slate-800 resize-none" />
          </div>
        </div>
      )}
    </div>
  );
}

export default KeyPanel;
