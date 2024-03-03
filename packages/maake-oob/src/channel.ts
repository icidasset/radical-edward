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
export type Codec<Payload> = T.Codec<
  TransportDataType,
  Msg<Payload>,
  Msg<Payload>,
  Error
>
export type Service<Payload> = T.Service<
  Array<T.IO<Msg<Payload>, Msg<Payload>>>,
  Msg<Payload>
>
export type TransportDataType = any

export type PayloadDecoder<Payload> = (data: Uint8Array) => Payload
export type PayloadEncoder<Payload> = (payload: Payload) => Uint8Array

// CHANNEL

class ChannelCodec<Payload> implements Codec<Payload> {
  #nonce: Uint8Array

  readonly #ourPrivateKey: Uint8Array
  readonly #providerPublicKey: Uint8Array
  readonly #payloadDecoder: PayloadDecoder<Payload>
  readonly #payloadEncoder: PayloadEncoder<Payload>

  constructor({
    ourPrivateKey,
    providerPublicKey,
    payloadDecoder,
    payloadEncoder,
  }: {
    ourPrivateKey: Uint8Array
    providerPublicKey: Uint8Array
    payloadDecoder: PayloadDecoder<Payload>
    payloadEncoder: PayloadEncoder<Payload>
  }) {
    this.#nonce = INITIAL_NONCE

    this.#ourPrivateKey = ourPrivateKey
    this.#providerPublicKey = providerPublicKey
    this.#payloadDecoder = payloadDecoder
    this.#payloadEncoder = payloadEncoder
  }

  #makeCipher(remotePublicKey: Uint8Array): Cipher {
    const { cipher, nextNonce } = makeCipher({
      nonce: this.#nonce,
      providerPublicKey: this.#providerPublicKey,
      ourPrivateKey: this.#ourPrivateKey,
      remotePublicKey,
    })

    this.#nonce = nextNonce

    return cipher
  }

  encode(data: Msg<Payload>): T.CodecEncoded<TransportDataType> {
    const cipher = this.#makeCipher(data.remotePublicKey)
    const json = {
      id: data.id,
      step: data.step,
      payload: encryptPayload(cipher, this.#payloadEncoder(data.payload)),
    }

    return {
      id: data.id,
      data: JSON.stringify(json),
    }
  }

  #decodeError(error: string, cause: any): { data: { error: Error } } {
    return {
      data: {
        error: new Error('Decoding error', {
          cause: new Error(error, { cause }),
        }),
      },
    }
  }

  decode(data: TransportDataType): T.CodecDecoded<T.Result<Msg<Payload>>> {
    const json = JSON.parse(data as string)

    if (!isProperMessage(json)) {
      return this.#decodeError('Improperly formatted channel data.', json)
    }

    // Decrypt
    const remotePublicKey = publicKeyFromDID(json.id)
    const cipher = this.#makeCipher(remotePublicKey)
    const decryptedPayload = decryptPayload(cipher, json.payload)

    return {
      id: undefined,
      data: {
        result: {
          remotePublicKey,
          id: json.id,
          step: json.step,
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
 * @param root0.providerPublicKey
 * @param root0.payloadDecoder
 * @param root0.payloadEncoder
 */
export function create<Payload>({
  transport,

  ourPrivateKey,
  providerPublicKey,
  payloadDecoder,
  payloadEncoder,
}: {
  transport: T.Transport<TransportDataType>

  ourPrivateKey: Uint8Array
  providerPublicKey: Uint8Array

  payloadDecoder: PayloadDecoder<Payload>
  payloadEncoder: PayloadEncoder<Payload>
}): Channel<Payload> {
  const codec = new ChannelCodec<Payload>({
    ourPrivateKey,
    providerPublicKey,
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
