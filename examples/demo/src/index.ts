import {
  Consumer,
  type OutOfBandParameters,
  Provider,
  type SendFn,
} from 'maake-oob'

import { PartyKitTransport as Transport } from './transports/partykit'

// 🏔️

const HOST = 'localhost:1999'

// 🧩

type Payload = Uint8Array

// PROVIDE

let params: OutOfBandParameters | undefined

/**
 *
 */
export async function provide(): Promise<void> {
  const provider = new Provider<Payload>()

  params = provider.params

  console.log('Providing', params)

  const transport = new Transport({
    peerId: provider.id,
    room: params.publicKey,
    host: HOST,
  })

  const consumers: Record<string, { id: string; send: SendFn<Payload> }> = {}

  provider.on('new-consumer', ({ id, send }) => {
    console.log('Secure tunnel established with', id)
    consumers[id] = { id, send }
  })

  provider.on('message', ({ id, payload }) => {
    console.log('Provider got message from', id, ':', payload)
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
 */
export async function consume(): Promise<void> {
  if (params === undefined) {
    throw new Error('Out of band parameters have not been provided yet')
  }

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

  const { send } = await consumer.consume({
    payloadDecoder: decoder,
    payloadEncoder: encoder,
    transport,
  })

  await send(new TextEncoder().encode('👋'))
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

  const onConsumeClick = (event: Event): void => {
    consume()
      .then(() => event.target?.removeEventListener('click', onConsumeClick))
      .catch(console.error)
  }

  document.querySelector('#provide')?.addEventListener('click', onProvideClick)
  document.querySelector('#consume')?.addEventListener('click', onConsumeClick)
})
