import * as IDB from 'idb-keyval'
import { CID, FileSystem, Path } from '@wnfs-wg/nest'
import { IDBBlockstore } from 'blockstore-idb'
import { base64 } from 'iso-base/rfc4648'

import * as Passkey from './passkey'

let capsuleKey: Uint8Array | undefined

// REGISTER

document.querySelector('#register')?.addEventListener('click', () => {
  register().catch(console.error)
})

/**
 *
 */
async function register(): Promise<void> {
  const result = await Passkey.create({ uniqueId: 'username' })
  if (!result.supported) throw new Error(result.reason)
}

// LOAD

document.querySelector('#load')?.addEventListener('click', () => {
  load().catch(console.error)
})

/**
 *
 */
async function load(): Promise<void> {
  const passkey = await Passkey.get({})
  if (
    passkey.supported &&
    passkey.assertion.clientExtensionResults.largeBlob?.blob !== undefined
  ) {
    capsuleKey = new Uint8Array(
      passkey.assertion.clientExtensionResults.largeBlob.blob
    )
  }

  const dataRoot: undefined | string = await IDB.get('dataRoot')

  const blockstore = new IDBBlockstore('blockstore')
  await blockstore.open()

  const fs =
    dataRoot === undefined
      ? await FileSystem.create({
          blockstore,
        })
      : await FileSystem.fromCID(CID.parse(dataRoot), {
          blockstore,
        })

  fs.on('commit', async ({ dataRoot }) => {
    await IDB.set('dataRoot', dataRoot.toString())
  })

  if (capsuleKey === undefined) {
    const result = await fs.createPrivateNode({ path: Path.root() })
    capsuleKey = result.capsuleKey
    console.log('Saved capsuleKey', base64.encode(capsuleKey))
    await Passkey.get({ blob: capsuleKey })
  } else {
    console.log('Resolved capsuleKey', base64.encode(capsuleKey))
    await fs.mountPrivateNode({
      path: Path.root(),
      capsuleKey,
    })
  }

  const path = Path.priv('test.txt')

  if (await fs.exists(path)) {
    console.log(await fs.read(path, 'utf8'))
  } else {
    await fs.write(path, 'utf8', new Date().toLocaleString())
  }
}
