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
  transport: Transport
}

export type SendFn<Payload> = (payload: Payload) => Promise<void>

// PROVIDE

export interface ProviderEvents<Payload> {
  'new-consumer': { id: string; send: SendFn<Payload> }
  message: { id: string; payload: Payload }
}

/**
 * Subscribe to a secure tunnel on behalf of the provider,
 * the party who provides the out of band parameters.
 *
 * @param channelConfig
 */
export function provide<Payload>(
  channelConfig: ChannelConfig<Payload>
): OutOfBandParameters {
  const challenge = randomBytes(16)

  const privateKey = x25519.utils.randomPrivateKey()
  const publicKey = x25519.getPublicKey(privateKey)

  const encodedPublicKey = base58btc.encode(tag(0xec, publicKey))
  const ourDID = `did:key:${encodedPublicKey}`

  // Event emitter
  const emitter = new Emittery<ProviderEvents<Payload>>()

  // Open channel
  const channel = Channel.create<MaakePayload<Payload>>({
    transport: channelConfig.transport,

    ourPrivateKey: privateKey,
    ourPublicKey: publicKey,
    payloadDecoder: maakePayloadDecoder(channelConfig.payloadDecoder),
    payloadEncoder: maakePayloadEncoder(channelConfig.payloadEncoder),
  })

  // Session(s)
  const sessions = new Map<string, ProviderSession<Payload>>()

  channel.on(
    'notification',
    async (msg: Channel.Msg<MaakePayload<Payload>>): Promise<void> => {
      let session = sessions.get(msg.id)

      if (session === undefined) {
        session = new ProviderSession<Payload>({
          channel,
          challenge,
          ourDID,
          remoteDID: msg.id,
        })
        sessions.set(msg.id, session)
      }

      const result = await session.proceed(msg)
      if (!result.admissible) return

      if (msg.step === 'handshake') {
        await emitter.emit('new-consumer', {
          id: msg.id,
          send: makeSend<Payload>({
            channel,
            ourDID,
            remotePublicKey: publicKeyFromDID(msg.id),
          }),
        })
      } else if (msg.payload.tunnelPayload !== undefined) {
        await emitter.emit('message', {
          id: msg.id,
          payload: msg.payload.tunnelPayload,
        })
      }
    }
  )

  // TODO:
  // channel.on('error', (err) => {
  //   //
  // })

  // Present out of band params + send fn
  return {
    challenge: Uint8Arrays.toString(challenge, CIPHER_TEXT_ENCODING),
    publicKey: Uint8Arrays.toString(publicKey, CIPHER_TEXT_ENCODING),
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
export async function consume<Payload>(
  outOfBandParameters: OutOfBandParameters,
  channelConfig: ChannelConfig<Payload>
): Promise<{ send: SendFn<Payload> }> {
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
  const channel = Channel.create<MaakePayload<Payload>>({
    transport: channelConfig.transport,

    ourPrivateKey: privateKey,
    ourPublicKey: publicKey,
    payloadDecoder: maakePayloadDecoder(channelConfig.payloadDecoder),
    payloadEncoder: maakePayloadEncoder(channelConfig.payloadEncoder),
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
      handshakePayload: {
        challenge: Uint8Arrays.fromString(
          outOfBandParameters.challenge,
          CIPHER_TEXT_ENCODING
        ),
      },
      tunnelPayload: undefined,
    },
  })

  // Listen to messages & completion of handshake
  await new Promise((resolve) => {
    channel.on(
      'notification',
      async (msg: Channel.Msg<MaakePayload<Payload>>): Promise<void> => {
        await session.proceed(msg)
        if (msg.step === 'handshake') resolve(1)
      }
    )
  })

  // Send
  return {
    send: makeSend({ channel, ourDID, remotePublicKey }),
  }
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
      (!('tunnelPayload' in obj) ||
        ('tunnelPayload' in obj &&
          (typeof obj.tunnelPayload === 'string' ||
            obj.tunnelPayload === undefined)))
    )
      return {
        handshakePayload: obj.handshakePayload,
        tunnelPayload: payloadDecoder(data),
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
 * Create the function used to send messages through a tunnel.
 *
 * @param channel.channel
 * @param channel
 * @param ourDID
 * @param channel.ourDID
 * @param channel.remotePublicKey
 */
function makeSend<Payload>({
  channel,
  ourDID,
  remotePublicKey,
}: {
  channel: Channel.Channel<MaakePayload<Payload>>
  ourDID: string
  remotePublicKey: Uint8Array
}) {
  return async (payload: Payload | undefined) => {
    await channel.request({
      step: 'messages',
      id: ourDID,
      remotePublicKey,
      payload: {
        handshakePayload: {},
        tunnelPayload: payload,
      },
    })
  }
}
