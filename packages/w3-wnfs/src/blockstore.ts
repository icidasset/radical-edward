import type { Blockstore as BlockstoreInterface } from 'interface-blockstore'
import type { Client } from '@web3-storage/w3up-client/types'
import type { CID } from 'multiformats'

import { BaseBlockstore } from 'blockstore-core'
import { CAR } from '@web3-storage/upload-client'

import type { Tracker } from './tracker.js'

// 📦

/**
 * Use Web3Storage to retrieve blocks if the given blockstore,
 * the cache, doesn't have it.
 */
export class Blockstore extends BaseBlockstore {
  readonly #cache: BlockstoreInterface
  readonly #client: Client
  readonly #tracker: Tracker

  constructor({
    cache,
    client,
    tracker,
  }: {
    cache: BlockstoreInterface
    client: Client
    tracker: Tracker
  }) {
    super()

    this.#cache = cache
    this.#client = client
    this.#tracker = tracker
  }

  static create(args: {
    cache: BlockstoreInterface
    client: Client
    tracker: Tracker
  }): Blockstore {
    return new Blockstore(args)
  }

  async delete(key: CID): Promise<void> {
    await this.#cache.delete(key)
  }

  async flush(): Promise<void> {
    // Only flush if remote is ready
    if (this.#client.currentSpace() === undefined) return

    // Get blocks and store them on W3S
    const blocks = await this.#tracker.flush()
    const carFile = await CAR.encode(blocks)

    await this.#client.capability.store.add(carFile)
  }

  async get(key: CID): Promise<Uint8Array> {
    if (await this.#cache.has(key)) {
      return await this.#cache.get(key)
    }

    return await fetchSingleBlockFromGateway(key).then(async (r) => {
      await this.#cache.put(key, r)
      return r
    })
  }

  async has(key: CID): Promise<boolean> {
    const cache = await this.#cache.has(key)
    if (cache) return true
    return await checkIfGatewayHasBlock(key)
  }

  async put(key: CID, value: Uint8Array): Promise<CID> {
    await this.#cache.put(key, value)

    // Depot tracker
    const block = { bytes: value, cid: key.toV1() }
    await this.#tracker.track(key, block)

    // Fin
    return key
  }
}

// GATEWAY HELPERS

/**
 *
 * @param cid
 */
export async function checkIfGatewayHasBlock(cid: CID): Promise<boolean> {
  const r = await fetch(`https://${cid.toString()}.ipfs.w3s.link`, {
    method: 'HEAD',
  })

  if (r.ok) {
    return true
  }

  if (r.status === 429) {
    // Wait a bit and then try again
    const time =
      r.headers.get('Retry-After') === null
        ? 30
        : Number.parseInt(r.headers.get('Retry-After') ?? '30')

    return await new Promise((resolve, reject) => {
      setTimeout(() => {
        checkIfGatewayHasBlock(cid).then(resolve, reject)
      }, time * 1000)
    })
  }

  return false
}

/**
 *
 * @param cid
 */
export async function fetchSingleBlockFromGateway(
  cid: CID
): Promise<Uint8Array> {
  const r = await fetch(`https://${cid.toString()}.ipfs.w3s.link/?format=raw`)

  if (r.ok) {
    return new Uint8Array(await r.arrayBuffer())
  }

  if (r.status === 429) {
    // Wait a bit and then try again
    const time =
      r.headers.get('Retry-After') === null
        ? 30
        : Number.parseInt(r.headers.get('Retry-After') ?? '30')

    return await new Promise((resolve, reject) => {
      setTimeout(() => {
        fetchSingleBlockFromGateway(cid).then(resolve, reject)
      }, time * 1000)
    })
  }

  throw new Error('Failed to fetch block from gateway')
}
