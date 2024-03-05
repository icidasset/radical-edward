import type { Result, Transport } from '@fission-codes/channel/types'

import { base58btc } from 'iso-base/base-x'
import { base64url } from 'iso-base/rfc4648'
import { x25519 } from '@noble/curves/ed25519'
import { randomBytes } from 'iso-base/crypto'
import { tag } from 'iso-base/varint'
import Emittery from 'emittery'

import * as Channel from './channel'
import { type PayloadDecoder, type PayloadEncoder } from './common'
import { ConsumerSession, ProviderSession, type Session } from './session'

// TYPES

export interface OutOfBandParameters {
  challenge: string
  publicKey: string
}

export interface Config<Payload> {
  payloadDecoder: PayloadDecoder<Payload>
  payloadEncoder: PayloadEncoder<Payload>
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
  readonly #did: string

  constructor() {
    super()

    this.#challenge = randomBytes(16)
    this.#sessions = new Map()

    this.#privateKey = x25519.utils.randomPrivateKey()
    this.#publicKey = x25519.getPublicKey(this.#privateKey)
    this.#did = publicKeyToDid(this.#publicKey)
  }

  get id(): string {
    return this.#did
  }

  get params(): OutOfBandParameters {
    return {
      challenge: base64url.encode(this.#challenge),
      publicKey: base64url.encode(this.#publicKey),
    }
  }

  #session(
    config: Config<Payload>,
    channel: Channel.Channel,
    remoteDID: string
  ): ProviderSession<Payload> {
    let session = this.#sessions.get(remoteDID)

    if (session === undefined) {
      session = new ProviderSession<Payload>({
        channel,
        challenge: this.#challenge,
        ourDID: this.#did,
        ourPrivateKey: this.#privateKey,
        payloadDecoder: config.payloadDecoder,
        payloadEncoder: config.payloadEncoder,
        providerPublicKey: this.#publicKey,
        remoteDID,
      })

      this.#sessions.set(remoteDID, session)
    }

    return session
  }

  async provide(config: Config<Payload>): Promise<void> {
    const channel = Channel.create({ transport: config.transport })

    // Session(s)
    const onNotification = async (msg: Channel.Msg): Promise<void> => {
      const session = this.#session(config, channel, msg.did)
      const result = await session.proceed(msg)
      if (!result.admissible) return

      // Handshake approved
      if (result.handshake) {
        await this.emit('new-consumer', {
          did: msg.did,
          answer: answerFn(session),
          send: sendFn(session),
        })
        return
      }

      // Pass on messages after handshake
      if (result.payload.tunnel !== undefined) {
        await this.emit('message', {
          did: msg.did,
          msgId: msg.msgId,
          payload: result.payload.tunnel,
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
  readonly #did: string

  readonly #remotePublicKey: Uint8Array
  readonly #remoteDID: string

  readonly #outOfBandParameters: OutOfBandParameters

  constructor(outOfBandParameters: OutOfBandParameters) {
    super()

    this.#privateKey = x25519.utils.randomPrivateKey()
    this.#publicKey = x25519.getPublicKey(this.#privateKey)
    this.#did = publicKeyToDid(this.#publicKey)

    this.#remotePublicKey = base64url.decode(outOfBandParameters.publicKey)
    const encodedRemotePublicKey = base58btc.encode(
      tag(0xec, this.#remotePublicKey)
    )

    this.#remoteDID = `did:key:${encodedRemotePublicKey}`
    this.#outOfBandParameters = outOfBandParameters
  }

  get id(): string {
    return this.#did
  }

  get providerId(): string {
    return this.#remoteDID
  }

  async consume(
    config: Config<Payload>
  ): Promise<{ answer: SendFn<Payload>; send: SendFn<Payload> }> {
    const channel = Channel.create({
      transport: config.transport,
    })

    // Session
    const session = new ConsumerSession({
      channel,
      ourDID: this.#did,
      ourPrivateKey: this.#privateKey,
      payloadDecoder: config.payloadDecoder,
      payloadEncoder: config.payloadEncoder,
      providerPublicKey: this.#remotePublicKey,
      remoteDID: this.#remoteDID,
    })

    // Listen to messages & completion of handshake
    const onNotification = async (msg: Channel.Msg): Promise<void> => {
      await session.proceed(msg).then(async (result) => {
        if (!result.admissible) return
        if (result.payload.tunnel !== undefined) {
          await this.emit('message', {
            did: msg.did,
            msgId: msg.msgId,
            payload: result.payload.tunnel,
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
    const response = await session.send(this.#did, {
      handshake: {
        challenge: this.#outOfBandParameters.challenge,
      },
    })

    if (response.error !== undefined) {
      throw response.error
    }

    // Fin
    return {
      answer: answerFn(session),
      send: sendFn(session),
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
 * @param session
 */
function answerFn<Payload>(session: Session<Payload>) {
  return async (
    msgId: string,
    payload: Payload,
    timeout?: number
  ): Promise<Result<Payload>> => {
    const response = await session.answer(msgId, { tunnel: payload }, timeout)

    if (response.error === undefined) {
      if (response.result.tunnel === undefined)
        return { error: new Error('Not a tunnel message') }
      return { result: response.result.tunnel }
    }

    return response
  }
}

/**
 *
 * @param session
 */
function sendFn<Payload>(session: Session<Payload>) {
  return async (
    msgId: string,
    payload: Payload,
    timeout?: number
  ): Promise<Result<Payload>> => {
    const response = await session.send(msgId, { tunnel: payload }, timeout)

    if (response.error === undefined) {
      if (response.result.tunnel === undefined)
        return { error: new Error('Not a tunnel message') }
      return { result: response.result.tunnel }
    }

    return response
  }
}
