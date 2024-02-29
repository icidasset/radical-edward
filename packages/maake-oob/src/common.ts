import * as Uint8Arrays from 'uint8arrays'

import { base58btc } from 'multiformats/bases/base58'
import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'
import { varint } from 'iso-base/varint'
import { xchacha20poly1305 } from '@noble/ciphers/chacha'
import { x25519 } from '@noble/curves/ed25519'

// 🏔️️

export const CIPHER_TEXT_ENCODING = 'base64url'
export const DOMAIN_SEPARATION_TAG = Uint8Arrays.fromString(
  'oddjs-qr-code',
  'utf8'
)

export const INITIAL_NONCE = new Uint8Array(0)

// 🧩️

export type Cipher = ReturnType<typeof xchacha20poly1305>
export type Step = 'handshake' | 'query' | 'fin'

export interface StepResult {
  nextStep: Step
}

// 🛠️

/**
 * Decrypt bytes.
 *
 * @param cipher
 * @param encryptedPayload
 */
export function decryptPayload(
  cipher: Cipher,
  encryptedPayload: string
): Uint8Array {
  return cipher.decrypt(
    Uint8Arrays.fromString(encryptedPayload, CIPHER_TEXT_ENCODING)
  )
}

/**
 * Decrypt a JSON payload.
 *
 * @param cipher
 * @param encryptedPayload
 */
export function decryptJSONPayload(
  cipher: Cipher,
  encryptedPayload: string
): unknown {
  return JSON.parse(
    Uint8Arrays.toString(decryptPayload(cipher, encryptedPayload), 'utf8')
  )
}

/**
 * Encrypt bytes.
 *
 * @param cipher
 * @param payload
 */
export function encryptPayload(cipher: Cipher, payload: Uint8Array): string {
  return Uint8Arrays.toString(cipher.encrypt(payload), CIPHER_TEXT_ENCODING)
}

/**
 * Encrypt a JSON payload.
 *
 * @param cipher
 * @param payload
 */
export function encryptJSONPayload(cipher: Cipher, payload: unknown): string {
  return encryptPayload(
    cipher,
    Uint8Arrays.fromString(JSON.stringify(payload), 'utf8')
  )
}

/**
 * Make a `Cipher`.
 *
 * @param params
 * @param params.nonce
 * @param params.ourPrivateKey
 * @param params.providerPublicKey
 * @param params.remotePublicKey
 */
export function makeCipher({
  nonce,
  ourPrivateKey,
  providerPublicKey,
  remotePublicKey,
}: {
  nonce: Uint8Array
  ourPrivateKey: Uint8Array
  providerPublicKey: Uint8Array
  remotePublicKey: Uint8Array
}): {
  cipher: Cipher
  nextNonce: Uint8Array
} {
  const sharedSecret = x25519.getSharedSecret(ourPrivateKey, remotePublicKey)
  const hashedNonce = sha256(nonce)

  const okm = hkdf(
    sha256,
    sharedSecret,
    providerPublicKey,
    Uint8Arrays.concat([
      DOMAIN_SEPARATION_TAG,
      Uint8Arrays.fromString(':', 'utf8'),
      hashedNonce,
    ]),
    32 + 24 + hashedNonce.length // length = ChaCha key + IV + next-nonce
  )

  const xChaChaKey = okm.slice(0, 32)
  const iv = okm.slice(32, 32 + 24)

  return {
    cipher: xchacha20poly1305(xChaChaKey, iv),
    nextNonce: okm.slice(32 + 24),
  }
}

/**
 * Get the public key bytes from a given DID with the `key` method.
 *
 * @param did
 */
export function publicKeyFromDID(did: string): Uint8Array {
  const encodedPublicKey = base58btc.decode(did.replace(/^did:key:/, ''))
  const [_code, size] = varint.decode(encodedPublicKey)
  return encodedPublicKey.slice(size)
}
