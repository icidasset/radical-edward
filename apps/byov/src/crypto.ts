import { concat, u8 } from 'iso-base/utils'
import { utf8 } from 'iso-base/utf8'
import { webcrypto } from 'iso-base/crypto'
import { ed25519 } from '@noble/curves/ed25519'

/**
 *
 * @param keyMaterial
 */
export async function buildEncryptionKey(
  keyMaterial: BufferSource
): Promise<CryptoKey> {
  const inputKeyMaterial = u8(keyMaterial)
  const keyDerivationKey = await webcrypto.subtle.importKey(
    'raw',
    inputKeyMaterial,
    'HKDF',
    false,
    ['deriveKey']
  )

  const encryptionKey = await webcrypto.subtle.deriveKey(
    {
      name: 'HKDF',
      info: utf8.decode('wnfs-passkey'),
      salt: new Uint8Array(),
      hash: 'SHA-256',
    },
    keyDerivationKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return encryptionKey
}

/**
 *
 * @param keyMaterial
 */
export function buildSigningKey(keyMaterial: BufferSource) {
  const privKey = u8(keyMaterial)
  const pubKey = ed25519.getPublicKey(privKey)

  return {
    public: pubKey,
    private: privKey,
  }
}

/**
 *
 * @param data
 * @param encryptionKey
 */
export async function decrypt(
  data: Uint8Array,
  encryptionKey: CryptoKey
): Promise<Uint8Array> {
  const iv = data.slice(0, 12)
  const encrypted = data.slice(12)
  const decrypted = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    encrypted.buffer
  )

  return u8(decrypted)
}

/**
 *
 * @param data
 * @param encryptionKey
 */
export async function encrypt(
  data: Uint8Array,
  encryptionKey: CryptoKey
): Promise<Uint8Array> {
  const iv = webcrypto.getRandomValues(new Uint8Array(12))

  const encrypted = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    data.buffer
  )

  return concat([iv, u8(encrypted)])
}
