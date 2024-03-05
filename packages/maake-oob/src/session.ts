import type { Result } from '@fission-codes/channel/types'

import { base64, base64url } from 'iso-base/rfc4648'
import { utf8 } from 'iso-base/utf8'
import { equals } from 'iso-base/utils'

import type * as Channel from './channel'
import {
  type Cipher,
  INITIAL_NONCE,
  type PayloadDecoder,
  type PayloadEncoder,
  decryptPayload,
  encryptPayload,
  makeCipher,
  publicKeyFromDID,
} from './common'

// 🧩

export type MaakePayload<Payload> =
  | {
      handshake: Record<string, unknown>
      tunnel?: undefined
    }
  | {
      handshake?: undefined
      tunnel: Payload
    }

export interface SessionConfig<Payload> {
  channel: Channel.Channel
  ourDID: string
  ourPrivateKey: Uint8Array
  payloadDecoder: PayloadDecoder<Payload>
  payloadEncoder: PayloadEncoder<Payload>
  providerPublicKey: Uint8Array
  remoteDID: string
}

// ABSTRACT CLASS

export abstract class Session<Payload> {
  readonly config: SessionConfig<Payload>
  readonly remotePublicKey: Uint8Array

  #handshakeCompleted: boolean
  #nonce: Uint8Array

  constructor(config: SessionConfig<Payload>) {
    this.config = config
    this.remotePublicKey = publicKeyFromDID(config.remoteDID)

    this.#handshakeCompleted = false
    this.#nonce = INITIAL_NONCE
  }

  // ENCODING & ENCRYPTION

  #decryptAndDecode(data: string): MaakePayload<Payload> {
    const bytes = decryptPayload(this.#makeCipher(), data)
    const obj = JSON.parse(utf8.encode(bytes))

    if (
      typeof obj === 'object' &&
      'handshake' in obj &&
      typeof obj.handshake === 'string'
    ) {
      return {
        handshake: JSON.parse(obj.handshake as string),
      }
    }

    if (
      typeof obj === 'object' &&
      'tunnel' in obj &&
      typeof obj.tunnel === 'string'
    ) {
      return {
        tunnel: this.config.payloadDecoder(base64.decode(obj.tunnel as string)),
      }
    }

    throw new Error('Failed to decode payload')
  }

  #encodeAndEncrypt(payload: MaakePayload<Payload>): string {
    const json = JSON.stringify(
      payload.tunnel === undefined
        ? { handshake: JSON.stringify(payload.handshake) }
        : { tunnel: base64.encode(this.config.payloadEncoder(payload.tunnel)) }
    )

    return encryptPayload(this.#makeCipher(), utf8.decode(json))
  }

  #makeCipher(): Cipher {
    const { cipher, nextNonce } = makeCipher({
      nonce: this.#nonce,
      providerPublicKey: this.config.providerPublicKey,
      ourPrivateKey: this.config.ourPrivateKey,
      remotePublicKey: this.remotePublicKey,
    })

    this.#nonce = nextNonce

    return cipher
  }

  // 📣

  async #send({
    fulfillRequest,
    msgId,
    payload,
    timeout,
  }: {
    fulfillRequest: boolean
    msgId: string
    payload: MaakePayload<Payload>
    timeout?: number
  }): Promise<Result<MaakePayload<Payload>>> {
    const response = await this.config.channel.request(
      {
        did: this.config.ourDID,
        encryptedPayload: this.#encodeAndEncrypt(payload),
        fulfillRequest,
        msgId,
      },
      timeout
    )

    if (response.error === undefined) {
      const proceedings = await this.proceed(response.result)

      if (!proceedings.admissible) {
        return { error: new Error(`Can't use response: ${proceedings.reason}`) }
      }

      return { result: proceedings.payload }
    }

    return response
  }

  async answer(
    msgId: string,
    payload: MaakePayload<Payload>,
    timeout?: number
  ): Promise<Result<MaakePayload<Payload>>> {
    return await this.#send({
      fulfillRequest: true,
      msgId,
      payload,
      timeout,
    })
  }

  async send(
    msgId: string,
    payload: MaakePayload<Payload>,
    timeout?: number
  ): Promise<Result<MaakePayload<Payload>>> {
    return await this.#send({
      fulfillRequest: false,
      msgId,
      payload,
      timeout,
    })
  }

  // 🚀

  async proceed(
    msg: Channel.Msg
  ): Promise<
    | { admissible: false; reason: string }
    | { admissible: true; payload: MaakePayload<Payload>; handshake: boolean }
  > {
    if (msg.did !== this.config.remoteDID)
      return {
        admissible: false,
        reason: 'DID did not match the remote peer DID.',
      }

    if (this.#handshakeCompleted)
      return {
        admissible: true,
        handshake: false,
        payload: this.#decryptAndDecode(msg.encryptedPayload),
      }

    const payload = this.#decryptAndDecode(msg.encryptedPayload)
    await this.handshake(msg, payload)
    this.#handshakeCompleted = true
    return { admissible: true, handshake: true, payload }
  }

  abstract handshake(
    msg: Channel.Msg,
    payload: MaakePayload<Payload>
  ): Promise<void>
}

// PROVIDER

export class ProviderSession<Payload> extends Session<Payload> {
  readonly #challenge: Uint8Array

  constructor(
    config: SessionConfig<Payload> & {
      challenge: Uint8Array
    }
  ) {
    super(config)
    this.#challenge = config.challenge
  }

  async handshake(
    msg: Channel.Msg,
    payload: MaakePayload<Payload>
  ): Promise<void> {
    const handshake = payload.handshake

    const hasCorrectChallenge =
      handshake !== undefined &&
      'challenge' in handshake &&
      typeof handshake.challenge === 'string' &&
      equals(base64url.decode(handshake.challenge), this.#challenge)

    if (!hasCorrectChallenge) {
      throw new Error(`Challenge failed during handshake with ${msg.did}`)
    }

    this.answer(msg.did, {
      handshake: { approved: true },
    }).catch((error) => {
      throw error
    })
  }
}

// CONSUMER

export class ConsumerSession<Payload> extends Session<Payload> {
  async handshake(
    msg: Channel.Msg,
    payload: MaakePayload<Payload>
  ): Promise<void> {
    if (
      payload.handshake === undefined ||
      typeof payload.handshake !== 'object' ||
      !('approved' in payload.handshake)
    )
      return

    if (payload.handshake.approved !== true) {
      throw new Error(`Cancelling session, provider did not approve.`)
    }
  }
}
