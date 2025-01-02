import { effect } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

import {
  PRIVATE_VIDEO_PATH,
  PUBLIC_VIDEO_PATH,
  type Video,
  listVideos,
} from '../fs/videos'
import { reactiveElement } from '../common'
import { fileSystem, setVideos, videos } from '../signals'
import { Pages } from '../routing'

/**
 *
 * @param fs
 */
export function YourVideos() {
  let timeoutId: undefined | ReturnType<typeof setTimeout>

  effect(() => {
    timeoutId = setTimeout(() => {
      setVideos('loading')
    }, 250)
  })

  // Load video list & update it when the source changes
  effect(async () => {
    const list = await listVideos()
    clearTimeout(timeoutId)
    setVideos(list)

    fileSystem().on('commit', async ({ modifications }) => {
      console.log('🔮 Commit', modifications)
      const videoListChanged = modifications.some((m) => m.path[1] === 'Videos')
      if (videoListChanged) setVideos(await listVideos())
    })
  })

  // Render
  return tags.div(
    {},
    reactiveElement(() => {
      const list = videos()

      if (list === 'loading')
        return tags.div(
          {
            className: 'border-b border-stone-800 mb-12 pb-12 text-sm',
          },
          text('LISTING VIDEOS ...')
        )

      if (list.length === 0) return tags.span({}, [])

      return tags.div(
        {
          className: 'border-b border-stone-800 mb-12 pb-12',
        },
        [
          tags.h2({}, text('Your videos')),

          //
          tags.ul(
            {
              className: 'pl-10',
              style: 'list-style-type: decimal-leading-zero',
            },
            list.map((video) => renderVideo(video))
          ),
        ]
      )
    })
  )
}

/**
 *
 * @param fs
 * @param video
 */
function renderVideo(video: Video) {
  return tags.li({}, [
    tags.span({}, text(video.name.length > 0 ? video.name : video.id)),
    // tags.br({}, []),
    // tags.span({}, text(video.name)),
    tags.br({}, []),
    tags.a(
      {
        className: 'cursor-pointer',
        onclick: async (event: Event) => {
          if (event.target !== null) {
            ;(event.target as HTMLElement).textContent = '♻️ REMOVING VIDEO ...'
          }

          const fs = fileSystem()
          await fs.remove([
            video.public ? 'public' : 'private',
            'Videos',
            video.id,
          ])
        },
      },
      text('🗑️ DELETE')
    ),
    tags.span({}, text(' / ')),
    tags.a(
      {
        className: 'cursor-pointer',
        onclick: async (event: Event) => {
          if (event.target !== null) {
            ;(event.target as HTMLElement).textContent = '🚛 MOVING FILES ...'
          }

          const fs = fileSystem()
          await fs.move(
            [
              ...(video.public ? PUBLIC_VIDEO_PATH : PRIVATE_VIDEO_PATH),
              video.id,
            ],
            [
              ...(video.public ? PRIVATE_VIDEO_PATH : PUBLIC_VIDEO_PATH),
              video.id,
            ]
          )
        },
      },
      text(video.public ? '🔐 MAKE PRIVATE' : '🌍 MAKE PUBLIC')
    ),
    tags.span({}, text(video.public ? ' / ' : '')),
    video.public && video.cid !== undefined
      ? tags.a({ href: Pages.Video(video.cid).url }, text('🍿 WATCH'))
      : tags.span({}, []),
  ])
}
