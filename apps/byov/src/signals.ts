import { signal } from 'spellcaster'

import type { Video } from './fs/videos'
import { setup } from './setup'
import * as ATProto from './atproto'

// SETUP

const context = await setup()

export const [blockstore, setBlockstore] = signal(context.blockstore)
export const [w3client, setW3Client] = signal(context.client)
export const [fileSystem, setFileSystem] = signal(context.fs)
export const [tracker, setTracker] = signal(context.tracker)
export const [isAuthenticated, setIsAuthenticated] = signal(
  context.isAuthenticated
)

// ATPROTO

export const [atSession, setATSession] = signal(
  await ATProto.client.init().then((r) => r?.session)
)

// MORE SIGNALS

export { page, setPage } from './routing'
export const [isUploading, setIsUploading] = signal(false)
export const [videos, setVideos] = signal<'loading' | Video[]>([])

// DERIVATIVES

/**
 *
 */
export function isConnectedToATProto(): boolean {
  return atSession() !== undefined
}

/**
 *
 */
export function isConnectedToStoracha(): boolean {
  return w3client().currentSpace() !== undefined
}
