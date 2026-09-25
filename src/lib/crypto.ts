// AES-GCM encryption utilities for browser-side message encryption
// Messages are encrypted before sending to the server and decrypted after retrieval

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptMessage(
  plaintext: string,
  passphrase: string
): Promise<{ ciphertext: string; iv: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const combined = new Uint8Array(salt.length + new Uint8Array(encrypted).length);
  combined.set(salt, 0);
  combined.set(new Uint8Array(encrypted), salt.length);

  return {
    ciphertext: toBase64(combined.buffer),
    iv: toBase64(iv.buffer),
  };
}

export async function decryptMessage(
  ciphertext: string,
  iv: string,
  passphrase: string
): Promise<string> {
  try {
    const combined = fromBase64(ciphertext);
    const ivBytes = fromBase64(iv);
    const salt = combined.slice(0, 16);
    const encryptedData = combined.slice(16);

    const key = await deriveKey(passphrase, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      encryptedData
    );

    return dec.decode(decrypted);
  } catch {
    return '[DECRYPTION FAILED — WRONG PASSPHRASE]';
  }
}

// Generate a random passphrase for new channels
export function generatePassphrase(): string {
  const words = [
    'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF',
    'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA', 'MIKE', 'NOVEMBER',
    'OSCAR', 'PAPA', 'QUEBEC', 'ROMEO', 'SIERRA', 'TANGO', 'UNIFORM',
    'VICTOR', 'WHISKEY', 'XRAY', 'YANKEE', 'ZULU'
  ];
  const num = Math.floor(Math.random() * 9000 + 1000);
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  return `${w1}-${w2}-${num}`;
}
