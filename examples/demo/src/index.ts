import {
  Consumer,
  type OutOfBandParameters,
  Provider,
  type SendFn,
} from 'maake-oob'

import { PartyKitTransport as Transport } from 'partykit-transport'
import QRCode from 'qrcode'

// 🏔️

const HOST = 'radical-party.icidasset.partykit.dev'

// 🧩

type Payload = Uint8Array

// PROVIDE

/**
 *
 */
export async function provide(): Promise<void> {
  const provider = new Provider<Payload>()

  log('Providing', JSON.stringify(provider.params))
  log('Waiting for a consumer')

  const url = new URL(location.href)
  url.searchParams.set('challenge', provider.params.challenge)
  url.searchParams.set('publicKey', provider.params.publicKey)

  const qrCodeDataURL = await QRCode.toDataURL(url.toString())
  const qrCodeNode = document.querySelector('#qr-code')
  if (qrCodeNode !== null) {
    qrCodeNode.innerHTML = `<img src="${qrCodeDataURL}" /><br /><a style="word-break: break-all;" href="${url.toString()}">${url.toString()}</a></br><button id="copy-url" style="margin-top: 1em; display: block;">Copy URL</button>`
    document.querySelector('#copy-url')?.addEventListener('click', () => {
      navigator.clipboard.writeText(url.toString()).catch(logError)
    })
  }

  const transport = new Transport({
    peerId: provider.id,
    room: provider.params.publicKey,
    host: HOST,
  })

  const consumers: Record<
    string,
    { did: string; answer: SendFn<Payload>; send: SendFn<Payload> }
  > = {}

  provider.on('new-consumer', async ({ did, answer, send }) => {
    log('Secure tunnel established with', did)
    consumers[did] = { did, answer, send }
  })

  provider.on('message', async ({ did, msgId, payload }) => {
    log(
      'Provider got message from',
      did,
      ':',
      new TextDecoder().decode(payload)
    )

    if (msgId === '👋') {
      consumers[did]
        ?.answer('👋', new TextEncoder().encode('🚀'))
        ?.catch(logError)
    }
  })

  // Listen for handshakes
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
  log('Consuming', JSON.stringify(params))
  log('Establishing secure tunnel')

  const consumer = new Consumer<Payload>(params)
  const transport = new Transport({
    peerId: consumer.id,
    room: params.publicKey,
    host: HOST,
  })

  consumer.on('message', ({ did, payload }) => {
    log(
      'Consumer got message from',
      did,
      ':',
      new TextDecoder().decode(payload)
    )
  })

  const { send } = await consumer.consume({
    payloadDecoder: decoder,
    payloadEncoder: encoder,
    transport,
  })

  log('Secure tunnel established with', consumer.providerId)

  const response = await send(
    '👋',
    new TextEncoder().encode('👋 from consumer')
  )

  if (response.error === undefined) {
    log('👋 result:', new TextDecoder().decode(response.result))
  } else {
    logError(response.error)
  }
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

/**
 *
 * @param args
 */
function log(...args: string[]): void {
  console.log(...args)

  const logItem = document.createElement('p')
  logItem.innerHTML = args.join(' ')

  document.querySelector('#log')?.append(logItem)
}

/**
 *
 * @param error
 */
function logError(error: Error): void {
  console.error(error)

  const logItem = document.createElement('p')
  logItem.style.color = 'red'
  logItem.innerHTML = error.message

  document.querySelector('#log')?.append(logItem)
}

// 🚀

document.addEventListener('DOMContentLoaded', () => {
  const onProvideClick = (event: Event): void => {
    provide()
      .then(() => event.target?.removeEventListener('click', onProvideClick))
      .catch(logError)
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
    }).catch(logError)
  }
})
