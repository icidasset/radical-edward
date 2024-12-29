import { tags, text } from 'spellcaster/hyperscript.js'

/**
 *
 */
export function VideosOnBluesky() {
  return tags.div({}, [
    tags.h2({}, text('Videos on Bluesky')),

    tags.p(
      { className: 'text-sm' },
      text('TODO: Set up a feed generator to gather all the BYOV videos.')
    ),
  ])
}
