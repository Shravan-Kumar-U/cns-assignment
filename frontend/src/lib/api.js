const API_URL = import.meta.env.VITE_API_URL;

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  generateKeys: () => request('/api/generate-keys'),

  registerUser: (username, publicKey) =>
    request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, publicKey })
    }),

  listUsers: () => request('/api/users'),

  getUser: (username) => request(`/api/users/${encodeURIComponent(username)}`),

  encrypt: (message, publicKey) =>
    request('/api/encrypt', {
      method: 'POST',
      body: JSON.stringify({ message, publicKey })
    }),

  sign: (message, privateKey) =>
    request('/api/sign', {
      method: 'POST',
      body: JSON.stringify({ message, privateKey })
    }),

  verify: (message, signature, publicKey) =>
    request('/api/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature, publicKey })
    }),

  decrypt: (bundle, privateKey) =>
    request('/api/decrypt', {
      method: 'POST',
      body: JSON.stringify({ ...bundle, privateKey })
    }),

  sendMessage: (payload) =>
    request('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getInbox: (username) => request(`/api/messages/inbox/${encodeURIComponent(username)}`)
};
