// import type * as W3_UP from '@web3-storage/w3up-client'
import { Path } from '@wnfs-wg/nest'
import { tags, text } from 'spellcaster/hyperscript.js'
import { DIDKey } from 'iso-did/key'

import * as Crypto from '../crypto'
import * as FS from '../fs'
import * as Passkey from '../passkey'
import {
  blockstore,
  fileSystem,
  fileSystemSetup,
  isConnectedToStoracha,
  setFileSystem,
  w3client,
} from '../signals'
import { reactiveElement } from '../common'

/**
 *
 */
export function ConnectStoracha() {
  return tags.div(
    {
      className: 'mb-6',
    },
    reactiveElement(() => {
      return tags.button(
        { onclick: connect },
        text(
          isConnectedToStoracha()
            ? '☑️ Connected to Storacha'
            : '🌶️ Connect with Storacha'
        )
      )
    })
  )
}

export const PASSKEY_PATH: ['public', string] = ['public', '.passkey']

/**
 *
 * @param event
 */
async function connect(event: Event) {
  if (confirm('Register new passkey? Cancel to reuse old passkey.')) {
    await Passkey.create({
      uniqueId: 'BYOV FileSystem',
    })
  }

  const passkey = await Passkey.get()

  if (!passkey.supported) {
    alert('Your browser does not support the PRF extension for passkeys.')
    return
  }

  const signingKey = Crypto.buildSigningKey(passkey.results.first)
  const encryptionKey = await Crypto.buildEncryptionKey(passkey.results.second)
  const did = DIDKey.fromPublicKey('Ed25519', signingKey.public)

  const email = prompt("What's your email address? (Storacha account)")
  if (email === null) return

  const emailMatches = email.match(/\w+@\w+\.\w+/)
  if (emailMatches === null) return
  if (event.target === null) return

  const target = event.target as HTMLElement
  target.textContent = '🌶️ Connecting ... Check your email'

  const client = w3client()
  const account = await client.login(email as `${string}@${string}`)
  const spaces = client.spaces()

  await account.plan.wait()

  const spaceName = `BYOV/${did.toString()}`
  const existingSpace = spaces.find((space) => space.name === spaceName)

  let fs = fileSystem()

  if (existingSpace === undefined) {
    // TODO: skipGatewayAuthorization = false (currently set to true bc. gateway defined is down)
    const ownedSpace = await client.createSpace(spaceName, {
      account,
      skipGatewayAuthorization: true,
    })

    await ownedSpace.save()
    await client.setCurrentSpace(ownedSpace.did())

    await FS.Identity.assign({
      did: ownedSpace.did(),
      fs,
    })
  } else {
    await client.setCurrentSpace(existingSpace.did())

    fs = await FS.load({ blockstore: blockstore(), client })

    if (await fs.exists(PASSKEY_PATH)) {
      const encryptedCapsuleKey = await fs.read(PASSKEY_PATH, 'bytes')
      const capsuleKey = await Crypto.decrypt(
        encryptedCapsuleKey,
        encryptionKey
      )

      await FS.Keys.save({ key: capsuleKey, path: Path.root() })
      await FS.loadPrivate({ blockstore: blockstore(), fs })
    }

    setFileSystem(fs)
    await fileSystemSetup()
  }

  const capsuleKey = await FS.Keys.lookup({ path: Path.root() })
  if (capsuleKey === undefined) return

  const encryptedRootKey = await Crypto.encrypt(capsuleKey, encryptionKey)
  await fs.write(PASSKEY_PATH, 'bytes', encryptedRootKey)

  target.textContent = '☑️ Connected to Storacha'
}
