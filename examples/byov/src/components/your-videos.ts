import type { FileSystem } from '@wnfs-wg/nest'
import { effect, signal } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

import { listVideos } from '../fs/videos'

/**
 *
 * @param fs
 */
export function YourVideos(fs: FileSystem) {
  const [videos, setVideos] = signal<
    'loading' | Array<{ name: string; public: boolean }>
  >('loading')

  effect(async () => {
    setVideos(await listVideos(fs))
  })

  if (videos.length > 0) {
    return tags.div(
      {
        className: 'border-b border-stone-800 mb-12 pb-12',
      },
      [tags.h2({}, text('Your videos'))]
    )
  }

  return tags.span({}, [])
}
