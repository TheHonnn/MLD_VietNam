import { createHmac, timingSafeEqual } from 'node:crypto';

export const RELAY_PATH = '/v1/zalo/verify';
export const RELAY_WINDOW_MS = 60_000;

export function signRelayRequest(body: string, timestamp: string, nonce: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`POST\n${RELAY_PATH}\n${timestamp}\n${nonce}\n${body}`).digest('hex');
}

export function validRelaySignature(body: string, timestamp: string, nonce: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(signRelayRequest(body, timestamp, nonce, secret), 'hex'));
}
