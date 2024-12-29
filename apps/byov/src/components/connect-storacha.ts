// import type * as W3_UP from '@web3-storage/w3up-client'
import { Path } from '@wnfs-wg/nest'
import { tags, text } from 'spellcaster/hyperscript.js'
import { DIDKey } from 'iso-did/key'

import * as Crypto from '../crypto'
import * as FS from '../fs'
import * as Passkey from '../passkey'
import { blockstore, fileSystem, w3client } from '../signals'
import { reactiveElement } from '../common'

/**
 *
 */
export function ConnectStoracha() {
  return tags.div(
    {
      className: 'border-b border-stone-800 mb-12 pb-12 text-center',
    },
    reactiveElement(() => {
      const client = w3client()

      return tags.button(
        { onclick: connect },
        text(
          client.currentSpace() === undefined
            ? '🌶️ Connect with Storacha'
            : '☑️ Connected to Storacha'
        )
      )
    })
  )
}

/**
 *
 * @param event
 */
async function connect(event: Event) {
  if (confirm('Register new passkey?')) {
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
  target.textContent = '🌶️ Connecting ...'

  const client = w3client()
  const account = await client.login(email as `${string}@${string}`)
  const spaces = client.spaces()

  await account.plan.wait()

  const spaceName = `BYOV/${did.toString()}`
  const existingSpace = spaces.find((space) => space.name === spaceName)

  console.log(existingSpace)
  console.log(spaces)

  let fs = fileSystem()

  if (existingSpace === undefined) {
    const ownedSpace = await client.createSpace(spaceName, { account })
    await ownedSpace.save()
    await client.setCurrentSpace(ownedSpace.did())

    await FS.Identity.assign({
      did: ownedSpace.did(),
      fs,
    })
  } else {
    await client.setCurrentSpace(existingSpace.did())

    fs = await FS.load({ blockstore: blockstore(), client })

    if (await fs.exists(['public', '.passkey'])) {
      const encryptedCapsuleKey = await fs.read(['public', '.passkey'], 'bytes')
      const capsuleKey = await Crypto.decrypt(
        encryptedCapsuleKey,
        encryptionKey
      )

      await FS.Keys.save({ key: capsuleKey, path: Path.root() })
      await FS.loadPrivate({ blockstore: blockstore(), fs })
    }
  }

  const capsuleKey = await FS.Keys.lookup({ path: Path.root() })
  if (capsuleKey === undefined) return

  const encryptedRootKey = await Crypto.encrypt(capsuleKey, encryptionKey)
  await fs.write(['public', '.passkey'], 'bytes', encryptedRootKey)

  target.textContent = '🌶️ Connected'
}
