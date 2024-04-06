import * as Name from 'w3name'
import { concat } from 'iso-base/utils'
import { keys } from 'libp2p-crypto'

/**
 *
 * @param key
 * @param key.publicKey
 * @param key.privateKey
 */
export async function fromKey(key: {
  publicKey: Uint8Array
  privateKey: Uint8Array
}): Promise<Name.WritableName> {
  return await Name.from(
    keys.keysPBM.PrivateKey.encode({
      Type: keys.keysPBM.KeyType.Ed25519,
      Data: concat([key.privateKey, key.publicKey]),
    }).finish() as Uint8Array
  )
}

/**
 *
 * @param name
 */
export async function lookup(name: Name.Name | string): Promise<string> {
  const resp = await fetch(
    `https://name.web3.storage/name/${typeof name === 'string' ? name : name.toString()}`
  )
  const json = await resp.json()
  return json.value
}
