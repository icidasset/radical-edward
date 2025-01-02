import { tags, text } from 'spellcaster/hyperscript.js'
import { reactiveElements } from '../common'

/**
 *
 * @param cid
 */
export function Video(cid: string) {
  return tags.div(
    {},
    reactiveElements(() => {
      const url = `https://w3s.link/ipfs/${cid}`

      return [
        tags.h2({}, text('Video')),
        tags.div({}, [
          tags.video({ controls: true, preload: 'auto', src: url }, []),
        ]),
      ]
    })
  )
}
