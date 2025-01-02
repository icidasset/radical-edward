import { tags, text } from 'spellcaster/hyperscript.js'

import * as ATProto from '../atproto'
import { reactiveElement } from '../common'
import { isConnectedToATProto } from '../signals'

/**
 *
 */
export function ConnectAtProto() {
  return tags.div(
    {
      className: 'border-b border-stone-800 mb-12 pb-12 text-center',
    },
    reactiveElement(() => {
      return tags.button(
        { onclick: connect },
        text(
          isConnectedToATProto()
            ? '☑️ Connected to Bluesky'
            : '🦋 Connect with Bluesky'
        )
      )
    })
  )
}

/**
 *
 * @param event
 */
async function connect(event: Event) {
  const handle = prompt('What is your Bluesky handle?')
  if (handle === null) return

  await ATProto.client.signIn(handle)
}
