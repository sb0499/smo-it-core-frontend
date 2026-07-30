// End-to-End Encryption (E2EE) cryptographic helpers using native Web Crypto API

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Derive a symmetric key from password using PBKDF2 with email as unique salt
export async function deriveMasterKey(password: string, email: string): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(password);
  const salt = new TextEncoder().encode(email.toLowerCase().trim() + '-smo-salt');

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate new RSA-OAEP asymmetric key pair for a user
export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export the public key as JWK string
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

// Encrypt private key using the derived master key
export async function exportAndEncryptPrivateKey(privateKey: CryptoKey, masterKey: CryptoKey): Promise<string> {
  const jwk = await window.crypto.subtle.exportKey('jwk', privateKey);
  const jsonStr = JSON.stringify(jwk);
  const dataBytes = new TextEncoder().encode(jsonStr);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    dataBytes
  );

  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

// Decrypt and import private key using the derived master key
export async function decryptAndImportPrivateKey(encryptedPrivateKeyBase64: string, masterKey: CryptoKey): Promise<CryptoKey> {
  const combined = base64ToArrayBuffer(encryptedPrivateKeyBase64);
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);

  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    cipher
  );

  const jsonStr = new TextDecoder().decode(decryptedBytes);
  const jwk = JSON.parse(jsonStr);

  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

// Generate a random 256-bit symmetric AES-GCM channel key
export async function generateChannelKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt the channel key using recipient's public key (RSA-OAEP)
export async function encryptChannelKey(channelKey: CryptoKey, recipientPublicJwkString: string): Promise<string> {
  const rawKeyBytes = await window.crypto.subtle.exportKey('raw', channelKey);
  const publicJwk = JSON.parse(recipientPublicJwkString);

  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    publicJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const encryptedBytes = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawKeyBytes
  );

  return arrayBufferToBase64(encryptedBytes);
}

// Decrypt the channel key using user's private key (RSA-OAEP)
export async function decryptChannelKey(encryptedChannelKeyBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
  const encryptedBytes = base64ToArrayBuffer(encryptedChannelKeyBase64);

  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedBytes
  );

  return window.crypto.subtle.importKey(
    'raw',
    decryptedBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a message string with a symmetric channel key
export async function encryptMessage(messageText: string, channelKey: CryptoKey): Promise<string> {
  const messageBytes = new TextEncoder().encode(messageText);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipher = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    channelKey,
    messageBytes
  );

  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);

  return arrayBufferToBase64(combined.buffer);
}

// Decrypt a cipher string using a symmetric channel key
export async function decryptMessage(encryptedMessageBase64: string, channelKey: CryptoKey): Promise<string> {
  const combined = base64ToArrayBuffer(encryptedMessageBase64);
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);

  const decryptedBytes = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    channelKey,
    cipher
  );

  return new TextDecoder().decode(decryptedBytes);
}
