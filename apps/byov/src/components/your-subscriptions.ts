import { effect } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

import { reactiveElement } from '../common'

/**
 *
 */
export function YourSubscriptions() {
  // const [subs, _] = signal('loading')

  effect(async () => {
    // const subs = atSubs()
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
