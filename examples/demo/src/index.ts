import {
  Consumer,
  type OutOfBandParameters,
  Provider,
  type SendFn,
} from 'maake-oob'
import { WebSocket } from 'unws'
import { WebsocketTransport } from '@fission-codes/channel/transports/ws.js'

interface Payload {
  test: boolean
}

// PROVIDE

let params: OutOfBandParameters | undefined

export async function provide(): Promise<void> {
  const provider = new Provider<Payload>()
  const transport = new WebsocketTransport(
    `ws://0.0.0.0:8010/${provider.params.publicKey}`,
    {
      ws: WebSocket,
    }
  )

  params = provider.params

  console.log(params)

  const consumers: Record<string, { id: string; send: SendFn<Payload> }> = {}

  provider.on('new-consumer', ({ id, send }) => {
    console.log('New consumer', id)
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

export async function consume(): Promise<void> {
  if (params === undefined) {
    alert('Out of band parameters have not been provided yet')
    return
  }

  const consumer = new Consumer<Payload>(params)
  const transport = new WebsocketTransport(
    `ws://0.0.0.0:8010/${params.publicKey}`,
    {
      ws: WebSocket,
    }
  )

  consumer.on('message', ({ id, payload }) => {
    console.log('Consumer got message from', id, ':', payload)
  })

  await consumer.consume({
    payloadDecoder: decoder,
    payloadEncoder: encoder,
    transport,
  })
}

// 🛠️

function decoder(data: Uint8Array): Payload {
  return { test: true }
}

function encoder(payload: Payload): Uint8Array {
  return new Uint8Array()
}

// 🚀

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#provide')?.addEventListener('click', () => {
    provide()
  })
  document.querySelector('#consume')?.addEventListener('click', () => {
    consume()
  })
})
