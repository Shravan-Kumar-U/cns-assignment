const crypto = require('crypto');

// ---------- Key generation ----------
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { publicKey, privateKey };
}

// ---------- AES-256-GCM (symmetric) ----------
function generateSessionKey() {
  return crypto.randomBytes(32); // 256-bit AES key
}

function encryptMessage(message, sessionKey) {
  const iv = crypto.randomBytes(12); // 96-bit IV, recommended for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);

  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encryptedMessage: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decryptMessage(encryptedMessageHex, sessionKey, ivHex, authTagHex) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    sessionKey,
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedMessageHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ---------- RSA-OAEP (asymmetric, wraps the session key) ----------
function encryptSessionKey(sessionKey, publicKey) {
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    sessionKey
  );

  return encryptedKey.toString('hex');
}

function decryptSessionKey(encryptedSessionKeyHex, privateKey) {
  const encryptedKeyBuffer = Buffer.from(encryptedSessionKeyHex, 'hex');

  const decryptedKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    encryptedKeyBuffer
  );

  return decryptedKey; // Buffer (raw AES key)
}

// ---------- Digital signatures (RSA, proves WHO sent the message) ----------
// Note: this is the piece real PGP/S-MIME has that a pure confidentiality
// demo usually skips. Signing happens on the PLAINTEXT, with the SENDER's
// PRIVATE key (opposite direction from encryption -- that's what makes it a
// signature instead of encryption: anyone with the sender's public key can
// verify it, but only the sender could have produced it).
function signMessage(message, privateKey) {
  const signature = crypto.sign('sha256', Buffer.from(message, 'utf8'), privateKey);
  return signature.toString('hex');
}

function verifySignature(message, signatureHex, publicKey) {
  try {
    return crypto.verify(
      'sha256',
      Buffer.from(message, 'utf8'),
      publicKey,
      Buffer.from(signatureHex, 'hex')
    );
  } catch (err) {
    return false;
  }
}

module.exports = {
  generateKeyPair,
  generateSessionKey,
  encryptMessage,
  decryptMessage,
  encryptSessionKey,
  decryptSessionKey,
  signMessage,
  verifySignature
};
