import { createHmac, timingSafeEqual, createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

export const RELAY_PATH = '/v2/zalo/verify';
export const RELAY_WINDOW_MS = 60_000;

type Direction = 'request' | 'response';

function encryptionKey(secret: string, direction: Direction) {
  if (secret.length < 32) throw new Error('Invalid relay key');
  return Buffer.from(hkdfSync('sha256', secret, 'mld-zalo-relay-v2', `aes-256-gcm:${direction}`, 32));
}

function context(direction: Direction, timestamp: string, nonce: string) {
  return Buffer.from(`mld-zalo-relay-v2\n${RELAY_PATH}\n${direction}\n${timestamp}\n${nonce}`);
}

export function encryptRelayPayload(value: unknown, secret: string, direction: Direction, timestamp: string, nonce: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret, direction), iv);
  cipher.setAAD(context(direction, timestamp, nonce));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 2, iv: iv.toString('hex'), ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('hex') };
}

export function decryptRelayPayload(value: unknown, secret: string, direction: Direction, timestamp: string, nonce: string): any {
  const envelope = value as Record<string, unknown> | null;
  if (!envelope || envelope.version !== 2 || typeof envelope.iv !== 'string' || !/^[a-f0-9]{24}$/.test(envelope.iv)
    || typeof envelope.tag !== 'string' || !/^[a-f0-9]{32}$/.test(envelope.tag)
    || typeof envelope.ciphertext !== 'string' || !envelope.ciphertext.length || envelope.ciphertext.length > 24000) {
    throw new Error('Invalid encrypted relay payload');
  }
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  if (ciphertext.toString('base64') !== envelope.ciphertext) throw new Error('Invalid encrypted relay payload');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret, direction), Buffer.from(envelope.iv, 'hex'));
  decipher.setAAD(context(direction, timestamp, nonce));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
  // Do not use any plaintext until GCM authentication has succeeded.
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

export function signRelayRequest(body: string, timestamp: string, nonce: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`POST\n${RELAY_PATH}\n${timestamp}\n${nonce}\n${body}`).digest('hex');
}

export function validRelaySignature(body: string, timestamp: string, nonce: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signRelayRequest(body, timestamp, nonce, secret), 'hex'));
}
