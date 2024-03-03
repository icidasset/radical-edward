import {
  Consumer,
  type OutOfBandParameters,
  Provider,
  type SendFn,
} from 'maake-oob'

import { PartyKitTransport as Transport } from 'partykit-transport'
import QRCode from 'qrcode'

// 🏔️

const HOST = 'localhost:1999'

// 🧩

type Payload = Uint8Array

// PROVIDE

/**
 *
 */
export async function provide(): Promise<void> {
  const provider = new Provider<Payload>()

  console.log('Providing', provider.params)
  console.log('Waiting for a consumer')

  const url = new URL(location.href)
  url.searchParams.set('challenge', provider.params.challenge)
  url.searchParams.set('publicKey', provider.params.publicKey)

  const qrCodeDataURL = await QRCode.toDataURL(url.toString())
  const qrCodeNode = document.querySelector('#qr-code')
  if (qrCodeNode !== null)
    qrCodeNode.innerHTML = `<img src="${qrCodeDataURL}" /><br /><a href="${url.toString()}">${url.toString()}</a>`

  const transport = new Transport({
    peerId: provider.id,
    room: provider.params.publicKey,
    host: HOST,
  })

  const consumers: Record<string, { id: string; send: SendFn<Payload> }> = {}

  provider.on('new-consumer', async ({ id, send }) => {
    console.log('Secure tunnel established with', id)
    consumers[id] = { id, send }

    await send(new TextEncoder().encode('🚀'))
  })

  provider.on('message', async ({ id, payload }) => {
    console.log('Provider got message from', id, ':', payload)

    // await consumers[id]?.send(new TextEncoder().encode('🚀'))
  })

  await provider.provide({
    payloadDecoder: decoder,
    payloadEncoder: encoder,
    transport,
  })
}

// CONSUME

/**
 *
 * @param params
 */
export async function consume(params: OutOfBandParameters): Promise<void> {
  console.log('Consuming', params)
  console.log('Establishing secure tunnel')

  const consumer = new Consumer<Payload>(params)
  const transport = new Transport({
    peerId: consumer.id,
    room: params.publicKey,
    host: HOST,
  })

  consumer.on('message', ({ id, payload }) => {
    console.log('Consumer got message from', id, ':', payload)
  })

  await consumer.consume({
    payloadDecoder: decoder,
    payloadEncoder: encoder,
    transport,
  })

  console.log('Secure tunnel established with', consumer.providerId)

  // await send(new TextEncoder().encode('👋 from consumer'))
}

// 🛠️

/**
 *
 * @param data
 */
function decoder(data: Uint8Array): Payload {
  return data
}

/**
 *
 * @param payload
 */
function encoder(payload: Payload): Uint8Array {
  return payload
}

// 🚀

document.addEventListener('DOMContentLoaded', () => {
  const onProvideClick = (event: Event): void => {
    provide()
      .then(() => event.target?.removeEventListener('click', onProvideClick))
      .catch(console.error)
  }

  document.querySelector('#provide')?.addEventListener('click', onProvideClick)

  const url = new URL(location.href)
  const challenge = url.searchParams.get('challenge')
  const publicKey = url.searchParams.get('publicKey')

  if (challenge !== null && publicKey !== null) {
    document.querySelector('#provide')?.setAttribute('disabled', 'disabled')

    consume({
      challenge,
      publicKey,
    }).catch(console.error)
  }
})
