import { randomInt } from 'node:crypto';

const TOKEN_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export const OPAQUE_TOKEN_LENGTH = 24;

export function generateOpaqueToken(length = OPAQUE_TOKEN_LENGTH) {
  let token = '';
  for (let index = 0; index < length; index += 1) {
    token += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)];
  }
  return token;
}
