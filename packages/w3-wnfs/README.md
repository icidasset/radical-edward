# W3-WNFS

[![npm (scoped)](https://img.shields.io/npm/v/w3-wnfs)](https://www.npmjs.com/package/w3-wnfs)

Provides the necessary components to use WNFS with [Web3Storage](https://web3.storage).

## Features

- Blockstore that fetches from the `w3s.link` IPFS gateway.
- Tracking of changed blocks, so you know what to upload to W3S.
- Blockstore uses the tracker + a `flush` function to store the tracked blocks on W3S.
- Data root (root CID) management using uploads.

## How it works

The tracker tracks all the new blocks that Web3Storage doesn't have yet. These blocks are then **stored** on W3S when you call `blockstore.flush()`. The root CID that contains all those blocks is called the data root, which is registered as an **upload** when `Pointer.save()` is called.

Each time a new upload is registered, the old ones are removed; because there's currently no way to identify a particular upload.

Ideally this is used within a space that's used only for a single WNFS.

## Installation

```bash
npm install w3-wnfs
```

## Usage

Setting up all the pieces:
In this example we're keeping all the blocks around locally too in an indexedDB, but any "fallback" blockstore can be used.

```ts
import { Blockstore, Tracker } from 'w3-wnfs/blockstore'

import * as W3UP from '@web3-storage/w3up-client'
import * as IDB from 'idb-keyval'
import { IDBBlockstore } from 'blockstore-idb'

// 🌍 Web3Storage client.
const _client = await W3UP.create()

// 🪃 The tracker that keeps track of which blocks to upload
const tracker = await Tracker.create({
  // Example, store in indexedDB
  getter: async () => await IDB.get('block-tracker'),
  setter: async (table: SimplifiedTable) => {
    await IDB.set('block-tracker', table)
  },
})

// 📦 The blockstore that keeps around the individual data pieces of our WNFS
const cache = new IDBBlockstore(idbName)
await cache.open()

const _blockstore = await Blockstore.create({
  cache,
  tracker,
})
```

Then connect it with WNFS.
Here we use `@wnfs-wg/nest` as an example, but you could also use the `wnfs` package.

```ts
import { Pointer } from 'w3-wnfs'

const dataRoot = await Pointer.lookup({ client })

// Create or load file system
const fs =
  dataRoot === undefined
    ? await FileSystem.create({ blockstore })
    : await FileSystem.fromCID(dataRoot, { blockstore })

// Flush blocks and update pointer when publishing changes
fs.on('publish', async (event) => {
  await blockstore.flush()
  await Pointer.save({
    client,
    dataRoot: event.dataRoot,
  })
})
```

### Working offline

You can save the data root locally too so you can work offline:

```ts
import * as W3_WNFS from 'w3-wnfs'
import { CID } from 'w3-wnfs'

async function storePointerLocally(dataRoot: CID): Promise<void> {
  await IDB.set('data-root', dataRoot.toString())
}

async function lookupPointer(): Promise<CID | undefined> {
  const remote = navigator.onLine
    ? await W3_WNFS.Pointer.lookup({ client })
    : undefined
  if (remote !== undefined) return remote
  const value = await IDB.get(this.LOCAL_NAME)
  if (typeof value === 'string') return CID.parse(value)
  return undefined
}

// 🚀 Building on the example from above
const _dataRoot = await lookupPointer()

// `@wnfs-wg/nest` integration:
//
// Save data root locally when changes are committed
// (note: publish has a small delay, commit does not)
fs.on('commit', async (event) => {
  await storePointerLocally(event.dataRoot)
})
```

## Docs

Check <https://icidasset.github.io/radical-edward>

## Contributing

Read contributing guidelines [here](../../.github/CONTRIBUTING.md).

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/icidasset/radical-edward)

## License

This project is licensed under either of

- Apache License, Version 2.0, ([LICENSE-APACHE](../../LICENSE-APACHE) or
  [http://www.apache.org/licenses/LICENSE-2.0][apache])
- MIT license ([LICENSE-MIT](../../LICENSE-MIT) or
  [http://opensource.org/licenses/MIT][mit])

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in the work by you, as defined in the Apache-2.0
license, shall be dual licensed as above, without any additional terms or
conditions.

[apache]: https://www.apache.org/licenses/LICENSE-2.0
[mit]: http://opensource.org/licenses/MIT
