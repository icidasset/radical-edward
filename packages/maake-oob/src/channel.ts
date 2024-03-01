import type * as T from '@fission-codes/channel/types'
import * as C from '@fission-codes/channel'

import {
  type Cipher,
  INITIAL_NONCE,
  decryptPayload,
  encryptPayload,
  makeCipher,
  publicKeyFromDID,
} from './common.js'

// 🌳

export interface Msg<Payload> {
  step: string
  id: string
  remotePublicKey: Uint8Array
  payload: Payload
}

export type Channel<Payload> = C.Channel<Codec<Payload>, Service<Payload>>
export type Codec<Payload> = T.Codec<string, Msg<Payload>, Msg<Payload>, Error>
export type Service<Payload> = T.Service<
  Array<T.IO<Msg<Payload>, Msg<Payload>>>,
  Msg<Payload>
>

export type PayloadDecoder<Payload> = (data: Uint8Array) => Payload
export type PayloadEncoder<Payload> = (payload: Payload) => Uint8Array

// CHANNEL

class ChannelCodec<Payload> implements Codec<Payload> {
  #nonce: Uint8Array

  readonly #ourPrivateKey: Uint8Array
  readonly #ourPublicKey: Uint8Array
  readonly #payloadDecoder: PayloadDecoder<Payload>
  readonly #payloadEncoder: PayloadEncoder<Payload>

  constructor({
    ourPrivateKey,
    ourPublicKey,
    payloadDecoder,
    payloadEncoder,
  }: {
    ourPrivateKey: Uint8Array
    ourPublicKey: Uint8Array
    payloadDecoder: PayloadDecoder<Payload>
    payloadEncoder: PayloadEncoder<Payload>
  }) {
    this.#nonce = INITIAL_NONCE

    this.#ourPrivateKey = ourPrivateKey
    this.#ourPublicKey = ourPublicKey
    this.#payloadDecoder = payloadDecoder
    this.#payloadEncoder = payloadEncoder
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

  encode(data: Msg<Payload>): T.CodecEncoded<string> {
    const cipher = this.#makeCipher(data.remotePublicKey)

    return {
      id: data.id,
      data: JSON.stringify({
        id: data.id,
        step: data.step,
        payload: encryptPayload(cipher, this.#payloadEncoder(data.payload)),
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

  decode(data: unknown): T.CodecDecoded<T.Result<Msg<Payload>>> {
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
    const decryptedPayload = decryptPayload(cipher, parsed.payload)

    return {
      id: parsed.id,
      data: {
        result: {
          remotePublicKey,
          id: parsed.id,
          step: parsed.step,
          payload: this.#payloadDecoder(decryptedPayload),
        },
      },
    }
  }
}

// 🚀

/**
 * Create a channel.
 *
 * @param root0
 * @param root0.transport
 * @param root0.ourPrivateKey
 * @param root0.ourPublicKey
 * @param root0.payloadDecoder
 * @param root0.payloadEncoder
 */
export function create<Payload>({
  transport,

  ourPrivateKey,
  ourPublicKey,
  payloadDecoder,
  payloadEncoder,
}: {
  transport: T.Transport

  ourPrivateKey: Uint8Array
  ourPublicKey: Uint8Array

  payloadDecoder: PayloadDecoder<Payload>
  payloadEncoder: PayloadEncoder<Payload>
}): Channel<Payload> {
  const codec = new ChannelCodec<Payload>({
    ourPrivateKey,
    ourPublicKey,
    payloadDecoder,
    payloadEncoder,
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
    typeof x.id === 'string'
  )
}
