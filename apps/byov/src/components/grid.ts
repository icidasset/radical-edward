import { tags, text } from 'spellcaster/hyperscript.js'

export interface GridVideo {
  cid: string
  title: string
}

/**
 *
 * @param videos
 */
export function Grid(videos: GridVideo[]) {
  return tags.div(
    {
      className: 'gap-4 grid grid-cols-2 mt-5 sm:grid-cols-3',
    },
    videos.map((video) => {
      return tags.a(
        {
          className: 'block',
          href: `/video/${video.cid}`,
        },
        [
          tags.div(
            {
              className:
                'aspect-video bg-stone-700 flex items-center justify-center rounded',
            },
            [tags.span({}, text('🎞️'))]
          ),
          tags.div(
            {
              className: 'break-all leading-tight mt-2 text-xs',
            },
            text(video.title)
          ),
        ]
      )
    })
  )
}
