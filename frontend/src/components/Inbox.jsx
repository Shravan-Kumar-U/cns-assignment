import { useState, useEffect, useCallback } from 'react';
import {
  Inbox as InboxIcon, Loader2, AlertCircle, Unlock, ShieldCheck,
  ShieldAlert, ShieldQuestion, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import CopyButton from './CopyButton';

function LabeledBlock({ label, value, color, tall }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
        <CopyButton text={value} />
      </div>
      <p
        className={`text-xs font-mono ${color} break-all bg-slate-900 p-2 rounded-lg border border-slate-800 ${
          tall ? 'max-h-24 overflow-y-auto' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function timeAgo(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleString();
}

function MessageCard({ msg, keys, onDecrypt, decrypted }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDecrypt = async () => {
    setError('');
    setLoading(true);
    try {
      await onDecrypt(msg);
    } catch (err) {
      setError(err.message || 'Decryption failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white font-medium">
            From <span className="text-indigo-400">{msg.from}</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{timeAgo(msg.timestamp)}</p>
        </div>
        {!decrypted && (
          <button
            onClick={handleDecrypt}
            disabled={loading}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors shrink-0"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />}
            Decrypt
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 mt-2 animate-fade-in">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* Shown immediately, even before decrypting -- this is exactly what
          travelled over the network: unreadable ciphertext, plus the
          sender's public key (safe to see; it's public by definition and
          is what lets you verify their signature after decrypting). */}
      <div className="mt-3 space-y-2">
        <LabeledBlock
          label="Encrypted message (AES-256-GCM ciphertext, as received)"
          value={msg.encryptedMessage}
          color="text-sky-400"
        />
        <LabeledBlock
          label={`Sender's public key (${msg.from})`}
          value={msg.senderPublicKey || '(not provided with this message)'}
          color="text-emerald-400"
          tall
        />
      </div>

      {decrypted && (
        <div className="mt-3 animate-fade-in">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
            <p className="text-emerald-300 font-mono text-sm break-words">{decrypted.message}</p>
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {decrypted.signatureStatus === 'valid' && (
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck size={13} /> Signature verified — really from {msg.from}
              </span>
            )}
            {decrypted.signatureStatus === 'invalid' && (
              <span className="flex items-center gap-1 text-rose-400">
                <ShieldAlert size={13} /> Signature invalid — do not trust the sender claim
              </span>
            )}
            {decrypted.signatureStatus === 'none' && (
              <span className="flex items-center gap-1 text-slate-500">
                <ShieldQuestion size={13} /> Not signed
              </span>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mt-3 transition-colors"
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? 'Hide remaining bundle fields' : 'View remaining bundle fields (session key, IV, tag, signature)'}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {[
            ['Encrypted session key (RSA-OAEP)', msg.encryptedSessionKey, 'text-amber-400'],
            ['IV', msg.iv, 'text-violet-400'],
            ['Auth tag', msg.authTag, 'text-fuchsia-400'],
            ['Signature (RSA, signed with sender\'s private key)', msg.signature || '(none)', 'text-teal-400'],
          ].map(([label, value, color]) => (
            <LabeledBlock key={label} label={label} value={value} color={color} />
          ))}
        </div>
      )}
    </div>
  );
}

function Inbox({ username, keys, api }) {
  const [messages, setMessages] = useState([]);
  const [decryptedMap, setDecryptedMap] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const inbox = await api.getInbox(username);
      setMessages(inbox);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load inbox.');
    } finally {
      setLoading(false);
    }
  }, [username, api]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleDecrypt = async (msg) => {
    if (!keys) throw new Error('Generate your key pair first.');

    const { message } = await api.decrypt(
      {
        encryptedSessionKey: msg.encryptedSessionKey,
        encryptedMessage: msg.encryptedMessage,
        iv: msg.iv,
        authTag: msg.authTag
      },
      keys.privateKey
    );

    let signatureStatus = 'none';
    if (msg.signature && msg.senderPublicKey) {
      const { valid } = await api.verify(message, msg.signature, msg.senderPublicKey);
      signatureStatus = valid ? 'valid' : 'invalid';
    }

    setDecryptedMap((prev) => ({ ...prev, [msg.id]: { message, signatureStatus } }));
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <InboxIcon size={18} className="text-violet-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Inbox</h2>
        {messages.length > 0 && (
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{messages.length}</span>
        )}
        <button
          onClick={refresh}
          title="Refresh inbox"
          className="ml-auto text-slate-500 hover:text-white transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>
      <p className="text-sm text-slate-400 mb-4 ml-12">
        Messages sent to <span className="font-mono text-slate-300">{username}</span>, encrypted at rest. Decrypt with your private key.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Loading inbox...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400 mb-3 animate-fade-in">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {!loading && messages.length === 0 && !error && (
        <p className="text-sm text-slate-600">No messages yet. Ask someone to send you one.</p>
      )}

      <div className="space-y-3">
        {messages.map((msg) => (
          <MessageCard
            key={msg.id}
            msg={msg}
            keys={keys}
            decrypted={decryptedMap[msg.id]}
            onDecrypt={handleDecrypt}
          />
        ))}
      </div>
    </div>
  );
}

export default Inbox;
