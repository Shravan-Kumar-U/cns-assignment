import { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

function Compose({ username, keys }) {
  const [users, setUsers] = useState([]);
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshUsers = useCallback(async () => {
    try {
      const list = await api.listUsers();
      setUsers(list.filter((u) => u.username !== username));
    } catch {
      // silent — the inbox/keys panels already surface backend errors
    }
  }, [username]);

  useEffect(() => {
    refreshUsers();
    const interval = setInterval(refreshUsers, 5000);
    return () => clearInterval(interval);
  }, [refreshUsers]);

  const handleSend = async () => {
    setError('');
    setSuccess('');

    if (!keys) return setError('Generate your own key pair first (needed to sign the message).');
    if (!recipient) return setError('Choose a recipient who has generated keys.');
    if (!message.trim()) return setError('Type a message to send.');

    setLoading(true);
    try {
      // Always fetch the recipient's CURRENT public key right before
      // encrypting, rather than trusting the cached dropdown list -- if they
      // just (re)generated keys in their own tab, a cached/stale key here
      // would encrypt against a key they no longer hold the private half of,
      // and decryption would fail with an OAEP error on their end.
      const recipientUser = await api.getUser(recipient);

      // 1. AES-256-GCM encrypts the message; RSA-OAEP wraps the session key
      //    using the RECIPIENT's public key -- only they can unwrap it.
      const bundle = await api.encrypt(message, recipientUser.publicKey);

      // 2. Sign the original plaintext with OUR OWN private key, so the
      //    recipient can later prove this message really came from us.
      const { signature } = await api.sign(message, keys.privateKey);

      // 3. Send the bundle + signature + our public key to the recipient's inbox.
      await api.sendMessage({
        from: username,
        to: recipient,
        ...bundle,
        signature,
        senderPublicKey: keys.publicKey
      });

      setSuccess(`Encrypted message sent to ${recipient}.`);
      setMessage('');
    } catch (err) {
      setError(err.message || 'Send failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Send size={18} className="text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Compose &amp; send</h2>
        <button
          onClick={refreshUsers}
          title="Refresh recipient list"
          className="ml-auto text-slate-500 hover:text-white transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>
      <p className="text-sm text-slate-400 mb-4 ml-12">
        Encrypted with the recipient's public key, signed with yours.
      </p>

      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Recipient</label>
      <select
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        className="w-full bg-slate-950 text-white text-sm p-3 mt-2 mb-4 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500"
      >
        <option value="">
          {users.length === 0 ? 'No other users registered yet...' : 'Select a user...'}
        </option>
        {users.map((u) => (
          <option key={u.username} value={u.username}>{u.username}</option>
        ))}
      </select>

      <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your secret message here..."
        className="w-full h-24 bg-slate-950 text-white text-sm p-3 mt-2 mb-4 rounded-lg border border-slate-800 resize-none placeholder:text-slate-600"
      />

      <button
        onClick={handleSend}
        disabled={loading}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 px-5 rounded-lg transition-colors"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {loading ? 'Encrypting & sending...' : 'Encrypt & Send'}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400 mt-3 animate-fade-in">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 mt-3 animate-fade-in">
          <CheckCircle2 size={14} /> {success}
        </div>
      )}
    </div>
  );
}

export default Compose;
