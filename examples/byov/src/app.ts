import type * as w3up from '@web3-storage/w3up-client'
import type { Blockstore, Tracker } from 'w3-wnfs'

import { type FileSystem } from '@wnfs-wg/nest'

// import { signal } from 'spellcaster/spellcaster.js'
// import { tags, text } from 'spellcaster/hyperscript.js'

// TODO:
// * Upload video to private folder
// * List all private & public videos in one list
// * Add ability to make a video public or private
// * Stream a video (private or public)
// * Use ed25519 public key from passkey as FS identifier

// 🏡

/**
 *
 * @param root0
 * @param root0.blockstore
 * @param root0.client
 * @param root0.fs
 * @param root0.isAuthenticated
 * @param root0.tracker
 */
export async function init({
  blockstore,
  client,
  fs,
  isAuthenticated,
  tracker,
}: {
  blockstore: Blockstore
  client: w3up.Client
  fs: FileSystem
  isAuthenticated: boolean
  tracker: Tracker
}): Promise<void> {
  //
}
