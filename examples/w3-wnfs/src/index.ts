import type { FileSystem } from '@wnfs-wg/nest'

import { IDBBlockstore } from 'blockstore-idb'
import { Blockstore, type SimplifiedTable, Tracker } from 'w3-wnfs'

import * as IDB from 'idb-keyval'
import * as W3_UP from '@web3-storage/w3up-client'

import * as App from './app'
import * as FS from './fs'

// | (• ◡•)| (❍ᴥ❍ʋ)
//
// An example app that shows how to use WNFS with Web3Storage.

/**
 *
 */
async function setup(): Promise<{
  blockstore: Blockstore
  client: W3_UP.Client
  fs: FileSystem
  isAuthenticated: boolean
  tracker: Tracker
}> {
  // 🌍 Web3Storage client, our remote storage.
  const client = await W3_UP.create()

  // 🪃 The tracker keeps track of which blocks to upload remotely
  const tracker = await Tracker.create({
    getter: async () => await IDB.get('block-tracker'),
    setter: async (table: SimplifiedTable) => {
      await IDB.set('block-tracker', table)
    },
  })

  // 📦 The blockstore keeps around the individual data pieces of our file system
  const cache = new IDBBlockstore('blockstore')
  await cache.open()

  const blockstore = Blockstore.create({ cache, client, tracker })

  // 🗃️ Our file system, the data storage interface for our application
  const fs = await FS.load({ blockstore, client })

  // FS.EVENTS.PUBLISH – When the file system mutations settle,
  //                     store the file system blocks remotely.
  fs.on('publish', async (event) => {
    await blockstore.flush()
    await FS.Pointer.saveRemotely({
      client,
      dataRoot: event.dataRoot,
    })
  })

  // FS.EVENTS.COMMIT – Immediately after performing a file system mutation,
  //                    save the file system pointer locally.
  fs.on('commit', async (event) => {
    await FS.Pointer.saveLocally({
      dataRoot: event.dataRoot,
    })
  })

  // 💁 The account system associated with Web3Storage.
  const isAuthenticated = client.currentSpace() !== undefined

  // Fin
  return {
    blockstore,
    client,
    fs,
    isAuthenticated,
    tracker,
  }
}

// Example app, todo list.

const components = await setup()
await App.init(components)

// @ts-expect-error Just for debugging purposes
globalThis.fs = components.fs
