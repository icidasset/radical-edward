import * as IDB from 'idb-keyval'
import { CID, FileSystem, Path } from '@wnfs-wg/nest'
import { IDBBlockstore } from 'blockstore-idb'
import { base64, base64url } from 'iso-base/rfc4648'

import * as Passkey from './passkey'
import { buildEncryptionKey, encrypt } from './crypto'

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
  const capsuleKey: undefined | Uint8Array = await IDB.get('capsuleKey')

  // Create/Load FS
  const dataRoot: undefined | string = await IDB.get('dataRoot')

  const blockstore = new IDBBlockstore('blockstore')
  await blockstore.open()

  console.log(dataRoot)

  const fs =
    dataRoot === undefined
      ? await FileSystem.create({
          blockstore,
        })
      : await FileSystem.fromCID(CID.parse(dataRoot.split('/')[1]), {
          blockstore,
        })

  fs.on('publish', async ({ dataRoot }) => {
    const encryptedCapsuleKey: undefined | Uint8Array = await IDB.get(
      'encryptedCapsuleKey'
    )

    if (encryptedCapsuleKey === undefined) {
      throw new Error('`encryptedCapsuleKey` is missing from the database.')
    }

    const encCap = base64url.encode(encryptedCapsuleKey)
    await IDB.set('dataRoot', `${encCap}/${dataRoot.toString()}`)
  })

  if (capsuleKey === undefined) {
    // Create private root
    const passkey = await Passkey.get({})

    if (!passkey.supported) {
      throw new Error(passkey.reason)
    }

    // Signing key, not used atm: passkey.results.first
    // -> Could be used to get a X25519 key and use that to create private share for ourselves (unsupported atm)
    //
    // Encryption key material, passkey.results.second
    const keyMaterial = passkey.results.second
    const encryptionKey = await buildEncryptionKey(keyMaterial)

    // Node creation
    const result = await fs.createPrivateNode({ path: Path.root() })

    // Save keys
    await IDB.set('capsuleKey', result.capsuleKey)
    await IDB.set(
      'encryptedCapsuleKey',
      await encrypt(result.capsuleKey, encryptionKey)
    )

    console.log('Saved capsuleKey', base64.encode(result.capsuleKey))
  } else {
    // Load private root
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
