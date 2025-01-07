import type { Agent } from '@atproto/api'
import { effect, signal } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

import type { ListRecord } from '../atproto'
import { reactiveElement } from '../common'
import { atAgent, atSubs, isConnectedToATProto } from '../signals'
import { Grid, type GridVideo } from './grid'
import { ConnectAtProto } from './connect-atproto'

/**
 *
 */
export function YourSubscriptions() {
  const [videos, setVideos] = signal<GridVideo[] | 'loading'>('loading')

  effect(async () => {
    const subs = atSubs()
    const agent = atAgent()
    if (subs === undefined) return

    const dids = subs.map((s) => (s.value as any).subject as string)
    const records = await Promise.all(
      dids.map(async (did) => await lastFewVideos(agent, did))
    )

    const vids = records
      .flat()
      .sort((a, b) => {
        return (
          new Date((b.value as any).createdAt as string).getTime() -
          new Date((a.value as any).createdAt as string).getTime()
        )
      })
      .map((v) => {
        const { cid, title } = v.value as any
        return { cid, title }
      })

    setVideos(vids)
  })

  return tags.div({}, [
    tags.h2({}, text('Latest from your subscriptions')),

    tags.div(
      {},
      reactiveElement(() => {
        if (!isConnectedToATProto()) return ConnectAtProto()

        const v = videos()

        if (v === 'loading')
          return tags.p({ className: 'text-sm' }, text('LOADING SUBS ...'))

        return Grid(v)
      })
    ),
  ])
}

/**
 *
 * @param agent
 * @param did
 */
async function lastFewVideos(agent: Agent, did: string) {
  const getRecords = async (cursor?: string): Promise<ListRecord[]> => {
    const resp = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: 'ma.tokono.byov.video',
      cursor,
      limit: 10,
    })

    if (resp.data.cursor === undefined) return resp.data.records

    return await getRecords(resp.data.cursor).then((records: ListRecord[]) => [
      ...resp.data.records,
      ...records,
    ])
  }

  return await getRecords()
}
