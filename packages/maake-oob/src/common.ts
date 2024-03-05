import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'
import { varint } from 'iso-base/varint'
import { xchacha20poly1305 } from '@noble/ciphers/chacha'
import { x25519 } from '@noble/curves/ed25519'
import { base58btc } from 'iso-base/base-x'
import { base64url } from 'iso-base/rfc4648'
import { utf8 } from 'iso-base/utf8'
import { concat } from 'iso-base/utils'

// 🏔️️

export const DOMAIN_SEPARATION_TAG = utf8.decode('maake-oob')
export const INITIAL_NONCE = new Uint8Array(0)

// 🧩️

export type Cipher = ReturnType<typeof xchacha20poly1305>

export type PayloadDecoder<Payload> = (data: Uint8Array) => Payload
export type PayloadEncoder<Payload> = (payload: Payload) => Uint8Array

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
  return cipher.decrypt(base64url.decode(encryptedPayload))
}

/**
 * Encrypt bytes.
 *
 * @param cipher
 * @param payload
 */
export function encryptPayload(cipher: Cipher, payload: Uint8Array): string {
  return base64url.encode(cipher.encrypt(payload))
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
    concat([DOMAIN_SEPARATION_TAG, utf8.decode(':'), hashedNonce]),
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
