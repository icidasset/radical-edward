import type { Blockstore } from 'w3-wnfs'
import type { Client } from '@web3-storage/w3up-client/types'

import { CID, FileSystem, Path } from '@wnfs-wg/nest'
import * as IDB from 'idb-keyval'
import * as W3_WNFS from 'w3-wnfs'

// 🚀

/**
 *
 * @param root0
 * @param root0.blockstore
 * @param root0.client
 */
export async function load({
  blockstore,
  client,
}: {
  blockstore: Blockstore
  client: Client
}): Promise<FileSystem> {
  const dataRoot = await Pointer.lookup({ client })

  // Create or load file system
  const fs =
    dataRoot === undefined
      ? await FileSystem.create({ blockstore })
      : await FileSystem.fromCID(dataRoot, { blockstore })

  // Fin
  return fs
}

/**
 *
 * @param root0
 * @param root0.blockstore
 * @param root0.fs
 */
export async function loadPrivate({
  blockstore,
  fs,
}: {
  blockstore: Blockstore
  fs: FileSystem
}) {
  // WNFS can mount individual private nodes,
  // in this case we mount the root private node.
  const privatePath = Path.root()

  // State
  const storedKey = await Keys.lookup({ path: privatePath })

  // Create new or load existing private directory at the root
  if (storedKey === undefined) {
    const { capsuleKey } = await fs.createPrivateNode({
      path: Path.root(),
    })

    const dataRoot = await fs.calculateDataRoot()

    await Keys.save({ key: capsuleKey, path: Path.root() })
    await Pointer.saveLocally({ dataRoot })
  } else {
    await fs.mountPrivateNode({
      path: privatePath,
      capsuleKey: storedKey,
    })
  }

  return fs
}

// 💁 MANAGEMENT

export const Identity = {
  PATH: Path.pub('.well-known', 'did'),

  async assign({ did, fs }: { did: string; fs: FileSystem }): Promise<void> {
    await fs.write(this.PATH, 'utf8', did)
  },

  async lookup({ fs }: { fs: FileSystem }): Promise<string | undefined> {
    if (await fs.exists(this.PATH)) return await fs.read(this.PATH, 'utf8')
    return undefined
  },
}

// 🔐 MANAGEMENT

export const Keys = {
  async lookup({
    path,
  }: {
    path: Path.Segments
  }): Promise<Uint8Array | undefined> {
    return await IDB.get(`fs.keys.path:/${Path.toPosix(path)}`)
  },

  async save({
    key,
    path,
  }: {
    key: Uint8Array
    path: Path.Segments
  }): Promise<void> {
    await IDB.set(`fs.keys.path:/${Path.toPosix(path)}`, key)
  },
}

// 👉 MANAGEMENT

export const Pointer = {
  LOCAL_NAME: 'data-root',

  async deleteLocal(): Promise<void> {
    await IDB.del(this.LOCAL_NAME)
  },

  async lookup({ client }: { client: Client }): Promise<CID | undefined> {
    const remote = navigator.onLine
      ? await W3_WNFS.Pointer.lookup({ client })
      : undefined
    if (remote !== undefined) return remote
    const value = await IDB.get(this.LOCAL_NAME)
    if (typeof value === 'string') return CID.parse(value)
    return undefined
  },

  async saveLocally({ dataRoot }: { dataRoot: CID }): Promise<void> {
    await IDB.set(this.LOCAL_NAME, dataRoot.toString())
  },

  async saveRemotely({
    client,
    dataRoot,
  }: {
    client: Client
    dataRoot: CID
  }): Promise<void> {
    await W3_WNFS.Pointer.save({ client, dataRoot })
  },
}
