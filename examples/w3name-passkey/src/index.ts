import * as Name from 'w3name'
import { base64 } from 'iso-base/rfc4648'

import * as RadName from './name'
import * as Passkey from './passkey'

// 🏔️

let name: Name.WritableName | undefined

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

document.querySelector('#publish')?.addEventListener('click', () => {
  publish().catch(console.error)
})

/**
 *
 */
async function publish(): Promise<void> {
  if (name === undefined) name = await loadName()

  const rev = await Name.v0(name, 'data root')
  await Name.publish(rev, name.key)

  const value = await RadName.lookup(name)

  console.log('Resolved value:', value)
}

/**
 *
 */
async function loadName(): Promise<Name.WritableName> {
  const result = await Passkey.get({ mediation: 'optional' })

  if (!result.supported) {
    throw new Error(result.reason)
  }

  console.log('Public key:', base64.encode(result.publicKey))

  return await RadName.fromKey(result)
}
