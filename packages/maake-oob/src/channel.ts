import type * as T from '@fission-codes/channel/types'
import * as C from '@fission-codes/channel'

// 🌳

export interface Msg {
  did: string
  encryptedPayload: string
  fulfillRequest: boolean
  msgId: string
  step: string
}

export type Channel = C.Channel<Codec, Service>
export type Codec = T.Codec<TransportDataType, Msg, Msg, Error>
export type Service = T.Service<Array<T.IO<Msg, Msg>>, Msg>
export type TransportDataType = any

// CHANNEL

class ChannelCodec implements Codec {
  encode(data: Msg): T.CodecEncoded<TransportDataType> {
    return {
      id: data.msgId,
      data: JSON.stringify(data),
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

  decode(data: TransportDataType): T.CodecDecoded<T.Result<Msg>> {
    const json = JSON.parse(data as string)

    if (!isProperMessage(json)) {
      return this.#decodeError('Improperly formatted channel data.', json)
    }

    return {
      id: json.fulfillRequest ? json.msgId : undefined,
      data: { result: json },
    }
  }
}

// 🚀

/**
 * Create a channel.
 *
 * @param root0
 * @param root0.transport
 */
export function create({
  transport,
}: {
  transport: T.Transport<TransportDataType>
}): Channel {
  const codec = new ChannelCodec()
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
function isProperMessage(x: unknown): x is {
  did: string
  encryptedPayload: string
  fulfillRequest: boolean
  msgId: string
  step: string
} {
  return (
    typeof x === 'object' &&
    x !== null &&
    'did' in x &&
    'encryptedPayload' in x &&
    'fulfillRequest' in x &&
    'msgId' in x &&
    'step' in x &&
    typeof x.did === 'string' &&
    typeof x.fulfillRequest === 'boolean' &&
    typeof x.msgId === 'string' &&
    typeof x.step === 'string'
  )
}
