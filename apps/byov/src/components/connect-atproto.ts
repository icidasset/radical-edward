import { tags, text } from 'spellcaster/hyperscript.js'

/**
 *
 */
export function ConnectAtProto() {
  return tags.div(
    {
      className: 'border-b border-stone-800 mb-12 pb-12 text-center',
    },
    [tags.button({}, text('🦋 Connect with Bluesky'))]
  )
}
