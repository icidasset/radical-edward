import type { Blockstore } from 'interface-blockstore'
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
  // WNFS can mount individual private nodes,
  // in this case we mount the root private node.
  const privatePath = Path.root()

  // State
  const dataRoot = await Pointer.lookup({ client })
  const storedKey = await Keys.lookup({ path: privatePath })

  // Create or load file system
  const fs =
    dataRoot === undefined
      ? await FileSystem.create({ blockstore })
      : await FileSystem.fromCID(dataRoot, { blockstore })

  // Create new or load existing private directory at the root
  if (storedKey === undefined) {
    const { capsuleKey } = await fs.mountPrivateNode({
      path: Path.root(),
    })

    // This will also trigger a commit + publish
    await Keys.save({ key: capsuleKey, path: Path.root() })
  } else {
    await fs.mountPrivateNode({
      path: privatePath,
      capsuleKey: storedKey,
    })
  }

  // Fin
  return fs
}

// 💁 MANAGEMENT

export const Identity = {
  PATH: Path.file('public', '.well-known', 'did'),

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
    path: Path.Directory<Path.Segments>
  }): Promise<Uint8Array | undefined> {
    return await IDB.get(`fs.keys.path:/${Path.toPosix(path)}`)
  },

  async save({
    key,
    path,
  }: {
    key: Uint8Array
    path: Path.Directory<Path.Segments>
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
    if (navigator.onLine) return await W3_WNFS.Pointer.lookup({ client })
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
