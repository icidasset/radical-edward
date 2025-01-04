import { Agent } from '@atproto/api'
import type { Record } from '@atproto/api/src/client/types/com/atproto/repo/listRecords'
import { signal } from 'spellcaster'

import type { Video } from './videos'
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

export const [atAgent, setATAgent] = signal(
  await ATProto.client
    .init()
    .then((r) => r?.session)
    .then((session) => (session === undefined ? undefined : new Agent(session)))
)

export const [atProfile, setATProfile] = signal(
  await (async () => {
    const agent = atAgent()
    if (agent === undefined) return

    return await agent.getProfile({ actor: agent.assertDid })
  })()
)

export const [atSubs, setATSubs] = signal(
  await (async () => {
    const agent = atAgent()
    if (agent === undefined) return

    return await allSubscriptions(agent)
  })()
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
  return atAgent() !== undefined
}

/**
 *
 */
export function isConnectedToStoracha(): boolean {
  return w3client().currentSpace() !== undefined
}

// 📰

/**
 *
 * @param agent
 */
async function allSubscriptions(agent: Agent) {
  const getRecords = async (cursor?: string): Promise<Record[]> => {
    const resp = await agent.com.atproto.repo.listRecords({
      repo: agent.assertDid,
      collection: 'ma.tokono.byov.subscription',
      cursor,
      limit: 100,
    })

    if (resp.data.cursor === undefined) return resp.data.records

    return await getRecords(resp.data.cursor).then((records: Record[]) => [
      ...resp.data.records,
      ...records,
    ])
  }

  return await getRecords()
}

/**
 *
 */
export async function syncATSubs() {
  const agent = atAgent()
  if (agent === undefined) return

  setATSubs(await allSubscriptions(agent))
}
