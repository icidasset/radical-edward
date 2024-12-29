import { tags, text } from 'spellcaster/hyperscript.js'

/**
 *
 */
export function YourSubscriptions() {
  return tags.div({}, [
    tags.h2({}, text('Your subscriptions')),

    tags.p(
      { className: 'text-sm' },
      text(
        'TODO: Loop over your Bluesky follows, fetch data directly from PDSs and list all the BYOV videos.'
      )
    ),
  ])
}
