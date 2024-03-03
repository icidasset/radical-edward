import type { Message, WebSocketEventMap } from 'partysocket/ws'
import type {
  CodecEncoded,
  Transport,
  TransportEvents,
  TransportSendOptions,
} from '@fission-codes/channel/types'

import Emittery from 'emittery'
import PartySocket from 'partysocket'

// 🧩

export type DataType = Message

// ⚡

export class PartyKitTransport
  extends Emittery<TransportEvents<DataType>>
  implements Transport<DataType>
{
  readonly #partySocket: PartySocket

  constructor({ host, room }: { host: string; peerId: string; room: string }) {
    super()

    this.#partySocket = new PartySocket({
      host,
      room,
    })

    this.#partySocket.addEventListener(
      'message',
      this.#handleMessage.bind(this)
    )

    this.#partySocket.addEventListener('error', this.#handleError.bind(this))
    this.#partySocket.addEventListener('close', this.#handleClose.bind(this))
  }

  #handleMessage(event: WebSocketEventMap['message']): void {
    this.emit('response', event.data as Message).catch(andThrow)
  }

  #handleError(event: WebSocketEventMap['error']): void {
    this.emit(
      'error',
      new Error('Transport Error', { cause: event.error })
    ).catch(andThrow)
  }

  #handleClose(): void {
    this.emit('close').catch(andThrow)
  }

  async close(): Promise<void> {
    this.#partySocket.close()
    this.clearListeners()
  }

  async send(
    data: CodecEncoded<DataType>,
    _options?: TransportSendOptions
  ): Promise<void> {
    this.#partySocket.send(data.data)
  }
}

/**
 *
 * @param error
 */
function andThrow(error: Error): void {
  throw error
}
