const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Git does not track empty folders, so on a fresh clone (e.g. after
// deploying to Render) this directory may not exist yet. Create it
// defensively before any read/write happens.
//
// Note on persistence: Render's free-tier filesystem is NOT guaranteed to
// survive a redeploy (it can survive restarts/sleeps within the same
// deploy, but a new deploy gets a fresh disk). For a class demo this is
// fine -- just regenerate keys and re-register users if that happens.
// A real production app would use a database instead of JSON files.
fs.mkdirSync(__dirname, { recursive: true });

function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Users: { username: { publicKey, createdAt } } ----------
function getUsers() {
  return readJson(USERS_FILE, {});
}

function registerUser(username, publicKey) {
  const users = getUsers();
  const isNew = !users[username];
  users[username] = {
    publicKey,
    createdAt: isNew ? new Date().toISOString() : users[username].createdAt,
    updatedAt: new Date().toISOString()
  };
  writeJson(USERS_FILE, users);
  return users[username];
}

function getUser(username) {
  const users = getUsers();
  return users[username] || null;
}

// ---------- Messages: { username: [ {..., to, from, timestamp} ] } (keyed by recipient) ----------
function getInbox(username) {
  const messages = readJson(MESSAGES_FILE, {});
  return (messages[username] || []).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

function sendMessage(entry) {
  const messages = readJson(MESSAGES_FILE, {});
  if (!messages[entry.to]) messages[entry.to] = [];
  const record = {
    id: crypto_randomId(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  messages[entry.to].push(record);
  writeJson(MESSAGES_FILE, messages);
  return record;
}

function crypto_randomId() {
  // Avoid importing node crypto twice across files; simple unique id.
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

module.exports = {
  getUsers,
  registerUser,
  getUser,
  getInbox,
  sendMessage
};
