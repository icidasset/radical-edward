import * as Uint8Arrays from 'uint8arrays'

import { publicKeyFromDID } from './common'
import type * as Channel from './channel'

// 🧩

interface SessionConfig {
  channel: Channel.Channel
  ourDID: string
  remoteDID: string
}

// ABSTRACT CLASS

abstract class Session {
  readonly channel: Channel.Channel
  readonly ourDID: string
  readonly remoteDID: string
  readonly remotePublicKey: Uint8Array

  #step: string

  constructor({ channel, ourDID, remoteDID }: SessionConfig) {
    this.channel = channel
    this.ourDID = ourDID
    this.remoteDID = remoteDID
    this.remotePublicKey = publicKeyFromDID(remoteDID)

    this.#step = 'handshake'
  }

  async proceed(msg: Channel.Msg): Promise<void> {
    if (msg.id === this.ourDID) return
    if (msg.id !== this.remoteDID) return

    if (this.#step !== msg.step) {
      console.warn(
        `Ignoring client ${msg.id}, steps don't match. Received '${msg.step}', but the active step is '${this.#step}'.`
      )
      return
    }

    switch (msg.step) {
      case 'handshake': {
        await this.handshake(msg)
        this.#step = 'messages'
      }
    }
  }

  abstract handshake(msg: Channel.Msg): Promise<void>
}

// PROVIDER

export class ProviderSession extends Session {
  readonly #challenge: Uint8Array

  constructor(config: SessionConfig & { challenge: Uint8Array }) {
    super(config)
    this.#challenge = config.challenge
  }

  async handshake(msg: Channel.Msg): Promise<void> {
    const hasCorrectChallenge =
      msg.payload !== null &&
      typeof msg.payload === 'object' &&
      'challenge' in msg.payload &&
      Uint8Arrays.equals(msg.payload.challenge as Uint8Array, this.#challenge)

    if (!hasCorrectChallenge) {
      throw new Error(`Challenge failed during handshake with ${msg.id}`)
    }

    await this.channel.request({
      id: this.ourDID,
      step: 'handshake',
      remotePublicKey: this.remotePublicKey,
      payload: { approved: true },
    })
  }
}

// CONSUMER

export class ConsumerSession extends Session {
  async handshake(msg: Channel.Msg): Promise<void> {
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
