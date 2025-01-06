import { Agent } from '@atproto/api'
import type { Record } from '@atproto/api/src/client/types/com/atproto/repo/listRecords'
import { effect, signal } from 'spellcaster'

import { type Video, listVideos } from './videos'
import { setup } from './setup'
import * as ATProto from './atproto'
import * as FS from './fs'

// SETUP

const context = await setup()

export const [blockstore, setBlockstore] = signal(context.blockstore)
export const [w3client, setW3Client] = signal(context.client)
export const [fileSystem, setFileSystem] = signal(context.fs)
export const [fileSystemSetup, setupFileSystem] = signal(Promise.resolve())
export const [tracker, setTracker] = signal(context.tracker)

effect(() => {
  const bs = blockstore()
  const fs = fileSystem()

  /**
   *
   */
  async function setup() {
    // FS.EVENTS.PUBLISH – When the file system mutations settle,
    //                     store the file system blocks remotely.
    fs.on('publish', async (event) => {
      await bs.flush()
      await FS.Pointer.saveRemotely({
        client: w3client(),
        dataRoot: event.dataRoot,
      })
    })

    // FS.EVENTS.COMMIT – Immediately after performing a file system mutation,
    //                    save the file system pointer locally.
    fs.on('commit', async (event) => {
      await FS.Pointer.saveLocally({
        dataRoot: event.dataRoot,
      })
    })
  }

  setupFileSystem(setup())
})

// ATPROTO

export const [atAgent, setATAgent] = signal(
  await ATProto.client
    .init()
    .then((r) => r?.session)
    .then(
      (session) =>
        new Agent(session ?? 'https://lionsmane.us-east.host.bsky.network')
    )
)

export const [atProfile, setATProfile] = signal(
  await (async () => {
    const agent = atAgent()
    if (agent.did === undefined) return

    return await agent.getProfile({ actor: agent.assertDid })
  })()
)

export const [atSubs, setATSubs] = signal(
  await (async () => {
    const agent = atAgent()
    if (agent.did === undefined) return

    return await allSubscriptions(agent)
  })()
)

// MORE SIGNALS

export { page, setPage } from './routing'
export const [isUploading, setIsUploading] = signal(false)
export const [videos, setVideos] = signal<'loading' | Video[]>('loading')

effect(async () => {
  setVideos('loading')
  setVideos(await listVideos())
})

// DERIVATIVES

/**
 *
 */
export function isConnectedToATProto(): boolean {
  return atAgent().did !== undefined
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
  if (agent.did === undefined) return

  setATSubs(await allSubscriptions(agent))
}
