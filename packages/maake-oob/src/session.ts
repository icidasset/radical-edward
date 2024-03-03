import * as Uint8Arrays from 'uint8arrays'

import { CIPHER_TEXT_ENCODING, publicKeyFromDID } from './common'
import type * as Channel from './channel'

// 🧩

export interface MaakePayload<Payload> {
  handshakePayload: Record<string, unknown>
  tunnelPayload?: Payload
}

export interface SessionConfig<Payload> {
  channel: Channel.Channel<Payload>
  ourDID: string
  remoteDID: string
}

// ABSTRACT CLASS

abstract class Session<Payload> {
  readonly channel: Channel.Channel<Payload>
  readonly ourDID: string
  readonly remoteDID: string
  readonly remotePublicKey: Uint8Array

  #step: string

  constructor({ channel, ourDID, remoteDID }: SessionConfig<Payload>) {
    this.channel = channel
    this.ourDID = ourDID
    this.remoteDID = remoteDID
    this.remotePublicKey = publicKeyFromDID(remoteDID)

    this.#step = 'handshake'
  }

  async proceed(msg: Channel.Msg<Payload>): Promise<{ admissible: boolean }> {
    if (msg.id === this.ourDID) return { admissible: false }
    if (msg.id !== this.remoteDID) return { admissible: false }

    if (this.#step !== msg.step) {
      console.warn(
        `Ignoring client ${msg.id}, steps don't match. Received '${msg.step}', but the active step is '${this.#step}'.`
      )
      return { admissible: false }
    }

    switch (msg.step) {
      case 'handshake': {
        await this.handshake(msg)
        this.#step = 'messages'
      }
    }

    return { admissible: true }
  }

  abstract handshake(msg: Channel.Msg<Payload>): Promise<void>
}

// PROVIDER

export class ProviderSession<Payload> extends Session<MaakePayload<Payload>> {
  readonly #challenge: Uint8Array

  constructor(
    config: SessionConfig<MaakePayload<Payload>> & {
      challenge: Uint8Array
    }
  ) {
    super(config)
    this.#challenge = config.challenge
  }

  async handshake(msg: Channel.Msg<MaakePayload<Payload>>): Promise<void> {
    const handshakePayload = msg.payload.handshakePayload

    const hasCorrectChallenge =
      'challenge' in handshakePayload &&
      typeof handshakePayload.challenge === 'string' &&
      Uint8Arrays.equals(
        Uint8Arrays.fromString(
          handshakePayload.challenge,
          CIPHER_TEXT_ENCODING
        ),
        this.#challenge
      )

    if (!hasCorrectChallenge) {
      throw new Error(`Challenge failed during handshake with ${msg.id}`)
    }

    this.channel
      .request({
        id: this.ourDID,
        step: 'handshake',
        remotePublicKey: this.remotePublicKey,
        payload: {
          handshakePayload: { approved: true },
          tunnelPayload: undefined,
        },
      })
      .catch(console.error)
  }
}

// CONSUMER

export class ConsumerSession<Payload> extends Session<Payload> {
  async handshake(msg: Channel.Msg<Payload>): Promise<void> {
    if (
      msg.payload === null ||
      typeof msg.payload !== 'object' ||
      !('approved' in msg.payload)
    )
      return

    if (msg.payload.approved !== true) {
      throw new Error(`Cancelling session, provider did not approve.`)
    }
  }
}
