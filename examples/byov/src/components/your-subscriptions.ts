import { tags, text } from 'spellcaster/hyperscript.js'

/**
 *
 */
export function YourSubscriptions() {
  return tags.div({}, [
    tags.h2({}, text('Your subscriptions')),

    tags.div({}, [tags.button({}, text('🦋 Connect with Bluesky'))]),
  ])
}
