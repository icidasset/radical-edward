import { CID } from 'multiformats'
import type { Block, BlockWithCIDString } from './common.js'

// 🧩

export type Getter = () => Promise<SimplifiedTable | undefined>
export type Setter = (table: SimplifiedTable) => Promise<void>

export type SimplifiedTable = Array<
  BlockWithCIDString | { cid: string; flushed: true }
>

// TRACKER

export class Tracker {
  readonly #get: Getter
  readonly #set: Setter

  #table: Record<string, Block | { flushed: true }>

  constructor(
    get: Getter,
    set: Setter,
    table: Record<string, Block | { flushed: true }>
  ) {
    this.#get = get
    this.#set = set
    this.#table = table
  }

  static async create({
    getter,
    setter,
  }: {
    getter: Getter
    setter: Setter
  }): Promise<Tracker> {
    const table = (await getter()) ?? []
    const reconstructedTable: Record<string, Block | { flushed: true }> = {}

    for (const v of table) {
      if ('bytes' in v) {
        reconstructedTable[v.cid] = {
          bytes: v.bytes,
          cid: CID.parse(v.cid),
        }
      } else if ('flushed' in v) {
        reconstructedTable[v.cid] = {
          flushed: true,
        }
      }
    }

    return new Tracker(getter, setter, reconstructedTable)
  }

  async flush(): Promise<Block[]> {
    const blocks: Block[] = []

    for (const [k, v] of Object.entries(this.#table)) {
      if ('bytes' in v) {
        blocks.push(v)
        this.#table[k] = { flushed: true }
      }
    }

    return blocks
  }

  async track(cid: CID, block: Block): Promise<void> {
    this.#table[cid.toString()] = block
    await this.store()
  }

  private async store(): Promise<void> {
    await this.#set(
      Object.entries(this.#table).map(([k, v]) => {
        if ('cid' in v) return { cid: k, bytes: v.bytes }
        return { cid: k, flushed: true }
      })
    )
  }
}
