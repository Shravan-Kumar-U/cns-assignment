const express = require('express');
const cors = require('cors');
const {
  generateKeyPair,
  generateSessionKey,
  encryptMessage,
  decryptMessage,
  encryptSessionKey,
  decryptSessionKey,
  signMessage,
  verifySignature
} = require('./crypto/cryptoUtils');
const store = require('./data/store');

const app = express();

// Render (and most hosts) assign the port dynamically via an env var --
// the app must listen on whatever PORT it provides, not a hardcoded one.
// 5000 remains the default for local development only.
const PORT = process.env.PORT || 5000;

// FRONTEND_URL is set as an environment variable on Render once the
// Vercel frontend is deployed, e.g. "https://your-app.vercel.app".
// Multiple origins can be comma-separated (useful for keeping both the
// deployed URL and localhost working at the same time while testing).
// If FRONTEND_URL is not set at all, CORS falls back to allowing any
// origin -- fine for a class demo, but note this is wide open; a real
// production service would always pin this to an explicit allowlist.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('PGP/S-MIME Backend is running');
});

// ---------- Key generation ----------
app.get('/api/generate-keys', (req, res) => {
  const { publicKey, privateKey } = generateKeyPair();
  res.json({ publicKey, privateKey });
});

// ---------- User registry ----------
// A "user" here is just a display name + a public key. There is no password,
// because the assignment's focus is encryption, not authentication -- this
// is a deliberate simplification, worth mentioning if asked in the viva.
app.post('/api/users/register', (req, res) => {
  const { username, publicKey } = req.body;
  if (!username || !publicKey) {
    return res.status(400).json({ error: 'username and publicKey are required' });
  }
  const user = store.registerUser(username, publicKey);
  res.json({ username, ...user });
});

app.get('/api/users', (req, res) => {
  const users = store.getUsers();
  const list = Object.entries(users).map(([username, data]) => ({
    username,
    publicKey: data.publicKey,
    createdAt: data.createdAt
  }));
  res.json(list);
});

app.get('/api/users/:username', (req, res) => {
  const user = store.getUser(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ username: req.params.username, ...user });
});

// ---------- Encrypt (AES session key + RSA-wrap it) ----------
app.post('/api/encrypt', (req, res) => {
  try {
    const { message, publicKey } = req.body;
    if (!message || !publicKey) {
      return res.status(400).json({ error: 'message and publicKey are required' });
    }

    const sessionKey = generateSessionKey();
    const { encryptedMessage, iv, authTag } = encryptMessage(message, sessionKey);
    const encryptedSessionKey = encryptSessionKey(sessionKey, publicKey);

    res.json({ encryptedSessionKey, encryptedMessage, iv, authTag });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Encryption failed', details: err.message });
  }
});

// ---------- Sign / Verify (proves WHO sent the message) ----------
app.post('/api/sign', (req, res) => {
  try {
    const { message, privateKey } = req.body;
    if (!message || !privateKey) {
      return res.status(400).json({ error: 'message and privateKey are required' });
    }
    const signature = signMessage(message, privateKey);
    res.json({ signature });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signing failed', details: err.message });
  }
});

app.post('/api/verify', (req, res) => {
  try {
    const { message, signature, publicKey } = req.body;
    if (!message || !signature || !publicKey) {
      return res.status(400).json({ error: 'message, signature and publicKey are required' });
    }
    const valid = verifySignature(message, signature, publicKey);
    res.json({ valid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed', details: err.message });
  }
});

// ---------- Decrypt (RSA-unwrap session key + AES decrypt) ----------
app.post('/api/decrypt', (req, res) => {
  try {
    const { encryptedSessionKey, encryptedMessage, iv, authTag, privateKey } = req.body;
    if (!encryptedSessionKey || !encryptedMessage || !iv || !authTag || !privateKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sessionKey = decryptSessionKey(encryptedSessionKey, privateKey);
    const message = decryptMessage(encryptedMessage, sessionKey, iv, authTag);

    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Decryption failed. The data may be corrupted, or this private key does not match.', details: err.message });
  }
});

// ---------- Inbox: sending and fetching bundles between users ----------
// This is the "transmission" step -- in real PGP/S-MIME this would be an
// email attachment; here it's a JSON record stored under the recipient's
// username so their dashboard can pick it up.
app.post('/api/messages/send', (req, res) => {
  const { from, to, encryptedSessionKey, encryptedMessage, iv, authTag, signature, senderPublicKey } = req.body;
  if (!from || !to || !encryptedSessionKey || !encryptedMessage || !iv || !authTag) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const recipient = store.getUser(to);
  if (!recipient) {
    return res.status(404).json({ error: `No registered user named "${to}". Ask them to open their dashboard and generate keys first.` });
  }

  const record = store.sendMessage({
    from,
    to,
    encryptedSessionKey,
    encryptedMessage,
    iv,
    authTag,
    signature: signature || null,
    senderPublicKey: senderPublicKey || null
  });

  res.json({ success: true, id: record.id, timestamp: record.timestamp });
});

app.get('/api/messages/inbox/:username', (req, res) => {
  const inbox = store.getInbox(req.params.username);
  res.json(inbox);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
