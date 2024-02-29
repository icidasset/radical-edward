import type * as T from '@fission-codes/channel/types'
import * as C from '@fission-codes/channel'

import {
  type Cipher,
  INITIAL_NONCE,
  decryptJSONPayload,
  encryptJSONPayload,
  makeCipher,
  publicKeyFromDID,
} from './common.js'

// 🌳

export interface Msg {
  step: string
  id: string
  remotePublicKey: Uint8Array
  payload: unknown
}

export type Channel = C.Channel<Codec, Service>
export type Codec = T.Codec<string, Msg, Msg, Error>
export type Service = T.Service<Array<T.IO<Msg, Msg>>, Msg>

// CHANNEL

class ChannelCodec implements Codec {
  #nonce: Uint8Array

  readonly #ourPrivateKey: Uint8Array
  readonly #ourPublicKey: Uint8Array

  constructor({
    ourPrivateKey,
    ourPublicKey,
  }: {
    ourPrivateKey: Uint8Array
    ourPublicKey: Uint8Array
  }) {
    this.#nonce = INITIAL_NONCE

    this.#ourPrivateKey = ourPrivateKey
    this.#ourPublicKey = ourPublicKey
  }

  #makeCipher(remotePublicKey: Uint8Array): Cipher {
    const { cipher, nextNonce } = makeCipher({
      nonce: this.#nonce,
      providerPublicKey: this.#ourPublicKey,
      ourPrivateKey: this.#ourPrivateKey,
      remotePublicKey,
    })

    this.#nonce = nextNonce

    return cipher
  }

  encode(data: Msg): T.CodecEncoded<string> {
    const cipher = this.#makeCipher(data.remotePublicKey)

    return {
      id: data.id,
      data: JSON.stringify({
        id: data.id,
        step: data.step,
        payload: encryptJSONPayload(cipher, data.payload),
      }),
    }
  }

  #decodeError(error: string, cause: any): { data: { error: Error } } {
    return {
      data: {
        error: new Error(error, { cause }),
      },
    }
  }

  decode(data: unknown): T.CodecDecoded<T.Result<Msg>> {
    if (typeof data !== 'string')
      return this.#decodeError(
        `Invalid channel data type expected string got ${typeof data}.`,
        data
      )

    // Parse
    const parsed = JSON.parse(data)

    if (!isProperMessage(parsed)) {
      return this.#decodeError('Improperly formatted channel data.', parsed)
    }

    // Decrypt
    const remotePublicKey = publicKeyFromDID(parsed.id)
    const cipher = this.#makeCipher(remotePublicKey)
    const decryptedPayload = decryptJSONPayload(cipher, parsed.payload)

    if (typeof decryptedPayload !== 'object' || decryptedPayload === null)
      return this.#decodeError(
        'Improperly formatted channel data payload.',
        decryptedPayload
      )

    return {
      id: parsed.id,
      data: {
        result: {
          remotePublicKey,
          id: parsed.id,
          step: parsed.step,
          payload: decryptedPayload as Record<string, unknown>,
        },
      },
    }
  }
}

// 🚀

/**
 * Create a channel.
 *
 * @param config
 * @param config.transport
 * @param config.ourPrivateKey
 * @param config.ourPublicKey
 * @param config.remotePublicKey
 */
export function create({
  transport,

  ourPrivateKey,
  ourPublicKey,
}: {
  transport: T.Transport

  ourPrivateKey: Uint8Array
  ourPublicKey: Uint8Array
  remotePublicKey?: Uint8Array
}): Channel {
  const codec = new ChannelCodec({
    ourPrivateKey,
    ourPublicKey,
  })

  const channel = new C.Channel({
    codec,
    transport,
  })

  return channel
}

// ㊙️

/**
 * Check if the received message is of the correct format.
 *
 * @param x
 */
function isProperMessage(
  x: unknown
): x is { step: string; id: string; payload: string } {
  return (
    typeof x === 'object' &&
    x !== null &&
    'step' in x &&
    'id' in x &&
    'payload' in x &&
    typeof x.step === 'string' &&
    typeof x.id === 'string' &&
    typeof x.payload === 'string'
  )
}
