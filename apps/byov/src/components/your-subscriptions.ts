import { effect } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

import { reactiveElement } from '../common'
import { atAgent } from '../signals'

/**
 *
 */
export function YourSubscriptions() {
  // const [subs, _] = signal('loading')

  effect(async () => {
    const agent = atAgent()
    if (agent === undefined) return

    const list = await agent.com.atproto.repo.listRecords({
      repo: agent.assertDid,
      collection: 'ma.tokono.byov.subscription',
      limit: 25,
    })

    console.log(list)
  })

  return tags.div({}, [
    tags.h2({}, text('Your subscriptions')),

    // tags.p(
    //   { className: 'text-sm' },
    //   text(
    //     'TODO: Loop over your subscriptions (similar to Bluesky follow graph), fetch data directly from PDSs and list all the BYOV videos.'
    //   )
    // ),

    tags.div(
      {},
      reactiveElement(() => {
        return tags.span({}, text('Work in progress ...'))
      })
    ),
  ])
}
