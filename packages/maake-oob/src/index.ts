import type { Transport } from '@fission-codes/channel/types'

import * as Uint8Arrays from 'uint8arrays'
import { x25519 } from '@noble/curves/ed25519'
import { randomBytes } from 'iso-base/crypto'
import { tag } from 'iso-base/varint'
import { base58btc } from 'multiformats/bases/base58'
import { CIPHER_TEXT_ENCODING, publicKeyFromDID } from './common'

import * as Channel from './channel'
import { ConsumerSession, ProviderSession } from './session'

// TYPES

export interface OutOfBandParameters {
  challenge: string
  publicKey: string
}

export interface ChannelConfig {
  transport: Transport
}

export type SendFn = (payload: unknown) => Promise<void>

// PROVIDE

/**
 * Subscribe to a secure tunnel on behalf of the provider,
 * the party who provides the out of band parameters.
 *
 * @param channelConfig
 */
export function provide(channelConfig: ChannelConfig): OutOfBandParameters & {
  send: Promise<SendFn>
} {
  const challenge = randomBytes(16)

  const privateKey = x25519.utils.randomPrivateKey()
  const publicKey = x25519.getPublicKey(privateKey)

  const encodedPublicKey = base58btc.encode(tag(0xec, publicKey))
  const ourDID = `did:key:${encodedPublicKey}`

  // Open channel
  const channel = Channel.create({
    transport: channelConfig.transport,

    ourPrivateKey: privateKey,
    ourPublicKey: publicKey,
  })

  // Session(s)
  const sessions = new Map<string, ProviderSession>()
  const promise = new Promise<Uint8Array>((resolve) => {
    channel.on('notification', async (msg: Channel.Msg): Promise<void> => {
      let session = sessions.get(msg.id)

      if (session === undefined) {
        session = new ProviderSession({
          channel,
          challenge,
          ourDID,
          remoteDID: msg.id,
        })
        sessions.set(msg.id, session)
      }

      await session.proceed(msg)

      if (msg.step === 'handshake') {
        resolve(publicKeyFromDID(msg.id))
      }
    })
  })

  // TODO:
  // channel.on('error', (err) => {
  //   //
  // })

  // Present out of band params + send fn
  return {
    challenge: Uint8Arrays.toString(challenge, CIPHER_TEXT_ENCODING),
    publicKey: Uint8Arrays.toString(publicKey, CIPHER_TEXT_ENCODING),
    send: promise.then(makeSend(channel, ourDID)),
  }
}

// CONSUMER

/**
 * Subscribe to a secure tunnel on behalf of the consumer,
 * the party who consumes the out of band parameters.
 *
 * @param outOfBandParameters
 * @param channelConfig
 */
export async function consume(
  outOfBandParameters: OutOfBandParameters,
  channelConfig: ChannelConfig
): Promise<{ send: SendFn }> {
  const privateKey = x25519.utils.randomPrivateKey()
  const publicKey = x25519.getPublicKey(privateKey)

  const encodedPublicKey = base58btc.encode(tag(0xec, publicKey))
  const ourDID = `did:key:${encodedPublicKey}`

  const remotePublicKey = Uint8Arrays.fromString(
    outOfBandParameters.publicKey,
    CIPHER_TEXT_ENCODING
  )

  const encodedRemotePublicKey = base58btc.encode(tag(0xec, remotePublicKey))
  const remoteDID = `did:key:${encodedRemotePublicKey}`

  // Open channel
  const channel = Channel.create({
    transport: channelConfig.transport,

    ourPrivateKey: privateKey,
    ourPublicKey: publicKey,
  })

  // Session
  const session = new ConsumerSession({
    channel,
    ourDID,
    remoteDID,
  })

  // Initiate handshake
  await channel.request({
    remotePublicKey,

    id: ourDID,
    step: 'handshake',
    payload: {
      challenge: Uint8Arrays.fromString(
        outOfBandParameters.challenge,
        CIPHER_TEXT_ENCODING
      ),
    },
  })

  // Listen to messages & completion of handshake
  await new Promise((resolve) => {
    channel.on('notification', async (msg: Channel.Msg): Promise<void> => {
      await session.proceed(msg)

      if (msg.step === 'handshake') {
        resolve(remotePublicKey)
      }
    })
  })

  // Send
  return {
    send: makeSend(channel, ourDID)(remotePublicKey),
  }
}

// ㊙️

/**
 *
 * @param channel
 * @param ourDID
 */
function makeSend(channel: Channel.Channel, ourDID: string) {
  return (remotePublicKey: Uint8Array) => async (payload: unknown) => {
    await channel.request({
      step: 'messages',
      id: ourDID,
      remotePublicKey,
      payload,
    })
  }
}
