import { Agent, AtUri } from '@atproto/api'
import { DidResolverCommon } from '@atproto/oauth-client-browser'
import { effect, signal } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

import type { ListRecord } from '../atproto'
import { reactiveElement } from '../common'
import { atAgent, atSubs, isConnectedToATProto, syncATSubs } from '../signals'
import { Grid, type GridVideo } from './grid'

/**
 *
 * @param did
 */
export function Channel(did: string) {
  const [videos, setVideos] = signal<GridVideo[] | 'loading' | string>(
    'loading'
  )

  effect(async () => {
    const didres = new DidResolverCommon({})
    let endpoint: string

    try {
      const doc = await didres.resolve(did as `did:${string}:${string}`)
      const end = doc?.service?.[0]?.serviceEndpoint

      if (end === undefined) {
        setVideos('Service endpoint is missing from DID document')
        return
      }

      if (typeof end !== 'string') {
        setVideos('Service endpoint is not a string')
        return
      }

      endpoint = end
    } catch (error) {
      setVideos((error as Error).message)
      return
    }

    const agent = new Agent(endpoint)
    const vids = await allVideos(agent, did)

    setVideos(
      vids.map((v) => {
        const { cid, title } = v.value as any
        return { cid, title }
      })
    )
  })

  return tags.div({}, [
    tags.h2({}, text('Channel')),
    tags.div(
      {},
      reactiveElement(() => {
        const vids = videos()
        if (vids === 'loading')
          return tags.span({ className: 'text-sm' }, text('LOADING VIDEOS ...'))
        if (typeof vids === 'string')
          return tags.span(
            { className: 'text-sm' },
            text('FAILED TO LOAD CHANNEL 🧨: ' + vids)
          )

        return tags.div({}, [
          tags.p({}, [
            tags.strong({}, text(did)),
            tags.br(),
            tags.div(
              {},
              reactiveElement(() => {
                if (!isConnectedToATProto()) return tags.span({}, [])

                const subs = atSubs()
                const matchingSubs = (subs ?? []).filter(
                  (s) => (s.value as any).subject === did
                )

                if (matchingSubs.length > 0)
                  return tags.button(
                    {
                      onclick: unsubscribe(matchingSubs[0].uri),
                    },
                    text('Unsubscribe')
                  )

                return tags.button(
                  {
                    onclick: subscribe(did),
                  },
                  text('Subscribe')
                )
              })
            ),
          ]),
          Grid(vids),
        ])
      })
    ),
  ])
}

/**
 *
 * @param agent
 * @param did
 */
async function allVideos(agent: Agent, did: string) {
  const getRecords = async (cursor?: string): Promise<ListRecord[]> => {
    const resp = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: 'ma.tokono.byov.video',
      cursor,
      limit: 100,
    })

    if (resp.data.cursor === undefined) return resp.data.records

    return await getRecords(resp.data.cursor).then((records: ListRecord[]) => [
      ...resp.data.records,
      ...records,
    ])
  }

  return await getRecords()
}

/**
 *
 * @param profileDID
 */
function subscribe(profileDID: string) {
  return async () => {
    const agent = atAgent()
    if (agent?.did === undefined) return

    await agent.com.atproto.repo.createRecord({
      repo: agent.assertDid,
      collection: 'ma.tokono.byov.subscription',
      record: {
        $type: 'ma.tokono.byov.subscription',
        subject: profileDID,
        createdAt: new Date().toISOString(),
      },
    })

    await syncATSubs()
  }
}

/**
 *
 * @param uriString
 */
function unsubscribe(uriString: string) {
  return async () => {
    const agent = atAgent()
    if (agent?.did === undefined) return

    const uri = new AtUri(uriString)

    await agent.com.atproto.repo.deleteRecord({
      repo: agent.assertDid,
      collection: 'ma.tokono.byov.subscription',
      rkey: uri.rkey,
    })

    await syncATSubs()
  }
}
