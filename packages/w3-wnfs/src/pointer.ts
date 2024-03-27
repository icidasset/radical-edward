import type { Client } from '@web3-storage/w3up-client/types'
import { CID } from 'multiformats'

// 🛠️

/**
 *
 * @param root0
 * @param root0.client
 */
export async function lookup({
  client,
}: {
  client: Client
}): Promise<CID | undefined> {
  const list =
    client.currentSpace() === undefined
      ? undefined
      : await client.capability.upload.list()

  if (list?.results[0] !== undefined) {
    return CID.decode(list.results[0].root.bytes)
  }

  return undefined
}

/**
 *
 * @param root0
 * @param root0.client
 */
export async function remove({ client }: { client: Client }): Promise<void> {
  const list = await client.capability.upload.list()
  const promises = list.results.map(async (result) => {
    return await client.capability.upload.remove(result.root)
  })

  await Promise.all(promises)
}

/**
 *
 * @param root0
 * @param root0.client
 * @param root0.dataRoot
 */
export async function save({
  client,
  dataRoot,
}: {
  client: Client
  dataRoot: CID
}): Promise<void> {
  if (client.currentSpace() === undefined) return

  // Remove existing uploads
  await remove({ client })

  // Create new upload
  await client.capability.upload.add(dataRoot, [])
}
