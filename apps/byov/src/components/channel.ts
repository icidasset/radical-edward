import { type Agent, AtUri } from '@atproto/api'
import type { Record } from '@atproto/api/src/client/types/com/atproto/repo/listRecords'
import { effect, signal } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

import { reactiveElement } from '../common'
import { atAgent, atSubs, syncATSubs } from '../signals'

/**
 *
 * @param did
 */
export function Channel(did: string) {
  const [videos, setVideos] = signal<Record[] | 'loading'>('loading')

  effect(async () => {
    const agent = atAgent()
    const vids = await allVideos(agent, did)

    setVideos(vids)
  })

  return tags.div({}, [
    tags.h2({}, text('Channel')),
    tags.div(
      {},
      reactiveElement(() => {
        const vids = videos()
        if (vids === 'loading') return tags.span({}, text('Loading videos ...'))

        return tags.div({}, [
          tags.p({}, [
            tags.strong({}, text(did)),
            tags.br(),
            tags.div(
              {},
              reactiveElement(() => {
                const agent = atAgent()
                if (agent.did === undefined) return tags.span({}, [])

                const subs = atSubs()
                const matchingSubs = (subs ?? []).filter(
                  (s) => (s.value as any).subject === p.did
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
          tags.div(
            { className: 'gap-4 grid grid-cols-3 mt-5' },
            vids.map((video) => {
              return tags.a(
                {
                  className: 'block',
                  href: `/video/${(video.value as any).cid}`,
                },
                [
                  tags.div(
                    {
                      className:
                        'aspect-video bg-stone-700 flex items-center justify-center rounded',
                    },
                    [tags.span({}, text('🎞️'))]
                  ),
                  tags.div(
                    {
                      className: 'break-all leading-tight mt-2 text-xs',
                    },
                    text((video.value as any).title)
                  ),
                ]
              )
            })
          ),
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
  const getRecords = async (cursor?: string): Promise<Record[]> => {
    const resp = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: 'ma.tokono.byov.video',
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
 * @param profileDID
 */
function subscribe(profileDID: string) {
  return async () => {
    const agent = atAgent()
    if (agent.did === undefined) return

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
    if (agent.did === undefined) return

    const uri = new AtUri(uriString)

    await agent.com.atproto.repo.deleteRecord({
      repo: agent.assertDid,
      collection: 'ma.tokono.byov.subscription',
      rkey: uri.rkey,
    })

    await syncATSubs()
  }
}
