import type { Transport } from '@fission-codes/channel/types'

import * as Uint8Arrays from 'uint8arrays'
import { x25519 } from '@noble/curves/ed25519'
import { randomBytes } from 'iso-base/crypto'
import { tag } from 'iso-base/varint'
import { base58btc } from 'multiformats/bases/base58'
import Emittery from 'emittery'

import * as Channel from './channel'
import { CIPHER_TEXT_ENCODING, publicKeyFromDID } from './common'
import { ConsumerSession, type MaakePayload, ProviderSession } from './session'

// TYPES

export interface OutOfBandParameters {
  challenge: string
  publicKey: string
}

export interface ChannelConfig<Payload> {
  payloadDecoder: Channel.PayloadDecoder<Payload>
  payloadEncoder: Channel.PayloadEncoder<Payload>
  transport: Transport<Channel.TransportDataType>
}

export type SendFn<Payload> = (
  msgId: string,
  payload: Payload,
  timeout?: number
) => Promise<
  { error: Error; result?: undefined } | { error?: undefined; result: Payload }
>

// PROVIDE

export interface ProviderEvents<Payload> {
  error: Error
  message: { did: string; msgId: string; payload: Payload }
  'new-consumer': {
    did: string
    answer: SendFn<Payload>
    send: SendFn<Payload>
  }
}

/**
 * Subscribe to a secure tunnel on behalf of the provider,
 * the party who provides the out of band parameters.
 */
export class Provider<Payload> extends Emittery<ProviderEvents<Payload>> {
  readonly #challenge: Uint8Array
  readonly #sessions: Map<string, ProviderSession<Payload>>

  readonly #privateKey: Uint8Array
  readonly #publicKey: Uint8Array
  readonly #ourDID: string

  constructor() {
    super()

    this.#challenge = randomBytes(16)
    this.#sessions = new Map()

    this.#privateKey = x25519.utils.randomPrivateKey()
    this.#publicKey = x25519.getPublicKey(this.#privateKey)
    this.#ourDID = publicKeyToDid(this.#publicKey)
  }

  get id(): string {
    return this.#ourDID
  }

  get params(): OutOfBandParameters {
    return {
      challenge: Uint8Arrays.toString(this.#challenge, CIPHER_TEXT_ENCODING),
      publicKey: Uint8Arrays.toString(this.#publicKey, CIPHER_TEXT_ENCODING),
    }
  }

  async provide(channelConfig: ChannelConfig<Payload>): Promise<void> {
    const channel = Channel.create<MaakePayload<Payload>>({
      transport: channelConfig.transport,

      ourPrivateKey: this.#privateKey,
      providerPublicKey: this.#publicKey,
      payloadDecoder: maakePayloadDecoder(channelConfig.payloadDecoder),
      payloadEncoder: maakePayloadEncoder(channelConfig.payloadEncoder),
    })

    // Session(s)
    const onNotification = async (
      msg: Channel.Msg<MaakePayload<Payload>>
    ): Promise<void> => {
      let session = this.#sessions.get(msg.did)

      if (session === undefined) {
        session = new ProviderSession<Payload>({
          channel,
          challenge: this.#challenge,
          ourDID: this.#ourDID,
          remoteDID: msg.did,
        })
        this.#sessions.set(msg.did, session)
      }

      const result = await session.proceed(msg)
      if (!result.admissible) return

      // Handshake approved
      if (msg.msgId === 'handshake') {
        await this.emit('new-consumer', {
          did: msg.did,
          answer: makeSend<Payload>({
            channel,
            fulfillRequest: true,
            ourDID: this.#ourDID,
            remotePublicKey: publicKeyFromDID(msg.did),
          }),
          send: makeSend<Payload>({
            channel,
            fulfillRequest: false,
            ourDID: this.#ourDID,
            remotePublicKey: publicKeyFromDID(msg.did),
          }),
        })
        return
      }

      // Pass on messages after handshake
      if (msg.payload.tunnelPayload !== undefined) {
        await this.emit('message', {
          did: msg.did,
          msgId: msg.msgId,
          payload: msg.payload.tunnelPayload,
        })
      }
    }

    channel.on('notification', onNotification)
    channel.on('error', async (error) => {
      // Bubble up channel errors
      await this.emit('error', error)
    })
  }
}

// CONSUME

export interface ConsumerEvents<Payload> {
  error: Error
  message: { did: string; msgId: string; payload: Payload }
}

/**
 * Subscribe to a secure tunnel on behalf of the consumer,
 * the party who consumes the out of band parameters.
 */
export class Consumer<Payload> extends Emittery<ConsumerEvents<Payload>> {
  readonly #privateKey: Uint8Array
  readonly #publicKey: Uint8Array
  readonly #ourDID: string

  readonly #remotePublicKey: Uint8Array
  readonly #remoteDID: string

  readonly #outOfBandParameters: OutOfBandParameters

  constructor(outOfBandParameters: OutOfBandParameters) {
    super()

    this.#privateKey = x25519.utils.randomPrivateKey()
    this.#publicKey = x25519.getPublicKey(this.#privateKey)
    this.#ourDID = publicKeyToDid(this.#publicKey)

    this.#remotePublicKey = Uint8Arrays.fromString(
      outOfBandParameters.publicKey,
      CIPHER_TEXT_ENCODING
    )

    const encodedRemotePublicKey = base58btc.encode(
      tag(0xec, this.#remotePublicKey)
    )

    this.#remoteDID = `did:key:${encodedRemotePublicKey}`
    this.#outOfBandParameters = outOfBandParameters
  }

  get id(): string {
    return this.#ourDID
  }

  get providerId(): string {
    return this.#remoteDID
  }

  async consume(
    channelConfig: ChannelConfig<Payload>
  ): Promise<{ answer: SendFn<Payload>; send: SendFn<Payload> }> {
    const channel = Channel.create<MaakePayload<Payload>>({
      transport: channelConfig.transport,

      ourPrivateKey: this.#privateKey,
      providerPublicKey: this.#remotePublicKey,
      payloadDecoder: maakePayloadDecoder(channelConfig.payloadDecoder),
      payloadEncoder: maakePayloadEncoder(channelConfig.payloadEncoder),
    })

    // Session
    const session = new ConsumerSession({
      channel,
      ourDID: this.#ourDID,
      remoteDID: this.#remoteDID,
    })

    // Listen to messages & completion of handshake
    const onNotification = async (
      msg: Channel.Msg<MaakePayload<Payload>>
    ): Promise<void> => {
      await session.proceed(msg).then(async ({ admissible }) => {
        if (admissible && msg.payload.tunnelPayload !== undefined) {
          await this.emit('message', {
            did: msg.did,
            msgId: msg.msgId,
            payload: msg.payload.tunnelPayload,
          })
        }
      })
    }

    channel.on('notification', onNotification)
    channel.on('error', async (error) => {
      // Bubble up channel errors
      await this.emit('error', error)
    })

    // Initiate handshake
    const response = await channel.request({
      remotePublicKey: this.#remotePublicKey,

      did: this.#ourDID,
      fulfillRequest: false,
      msgId: 'handshake',
      payload: {
        handshakePayload: {
          challenge: this.#outOfBandParameters.challenge,
        },
        tunnelPayload: undefined,
      },
    })

    if (response.error === undefined) {
      await session.proceed(response.result)
    } else {
      throw response.error
    }

    // Fin
    return {
      answer: makeSend({
        channel,
        fulfillRequest: true,
        ourDID: this.#ourDID,
        remotePublicKey: this.#remotePublicKey,
      }),
      send: makeSend({
        channel,
        fulfillRequest: false,
        ourDID: this.#ourDID,
        remotePublicKey: this.#remotePublicKey,
      }),
    }
  }
}

// 🛠️

/**
 *
 * @param publicKey
 */
function publicKeyToDid(publicKey: Uint8Array): string {
  const encodedPublicKey = base58btc.encode(tag(0xec, publicKey))
  return `did:key:${encodedPublicKey}`
}

// ㊙️

/**
 *
 * @param payloadDecoder
 */
function maakePayloadDecoder<Payload>(
  payloadDecoder: Channel.PayloadDecoder<Payload>
) {
  return (data: Uint8Array) => {
    const json = Uint8Arrays.toString(data, 'utf8')
    const obj = JSON.parse(json)

    if (
      typeof obj === 'object' &&
      'handshakePayload' in obj &&
      typeof obj.handshakePayload === 'string' &&
      (!('tunnelPayload' in obj) ||
        ('tunnelPayload' in obj &&
          (typeof obj.tunnelPayload === 'string' ||
            obj.tunnelPayload === undefined)))
    ) {
      return {
        handshakePayload: JSON.parse(obj.handshakePayload as string),
        tunnelPayload:
          'tunnelPayload' in obj && typeof obj.tunnelPayload === 'string'
            ? payloadDecoder(
                Uint8Arrays.fromString(obj.tunnelPayload as string, 'base64')
              )
            : undefined,
      }
    }

    throw new Error('Failed to decode payload')
  }
}

/**
 *
 * @param payloadEncoder
 */
function maakePayloadEncoder<Payload>(
  payloadEncoder: Channel.PayloadEncoder<Payload>
) {
  return (payload: MaakePayload<Payload>) => {
    const json = JSON.stringify({
      handshakePayload: JSON.stringify(payload.handshakePayload),
      tunnelPayload:
        payload.tunnelPayload === undefined
          ? undefined
          : Uint8Arrays.toString(
              payloadEncoder(payload.tunnelPayload),
              'base64'
            ),
    })

    return Uint8Arrays.fromString(json, 'utf8')
  }
}

/**
 *
 * @param root0
 * @param root0.channel
 * @param root0.fulfillRequest
 * @param root0.ourDID
 * @param root0.remotePublicKey
 */
function makeSend<Payload>({
  channel,
  fulfillRequest,
  ourDID,
  remotePublicKey,
}: {
  channel: Channel.Channel<MaakePayload<Payload>>
  fulfillRequest: boolean
  ourDID: string
  remotePublicKey: Uint8Array
}) {
  return async (
    msgId: string,
    payload: Payload | undefined,
    timeout?: number
  ) => {
    const response = await channel.request(
      {
        did: ourDID,
        msgId,
        fulfillRequest,
        remotePublicKey,
        payload: {
          handshakePayload: {},
          tunnelPayload: payload,
        },
      },
      timeout
    )

    if (response.error === undefined) {
      if (response.result.payload.tunnelPayload === undefined) {
        throw new Error('Unexpected state: tunnelPayload is undefined')
      }

      return { result: response.result.payload.tunnelPayload }
    }

    return response
  }
}
