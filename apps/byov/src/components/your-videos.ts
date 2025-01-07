import type { Events } from '@wnfs-wg/nest'
import { effect } from 'spellcaster'
import { tags, text } from 'spellcaster/hyperscript.js'

import { AtUri } from '@atproto/api'
import {
  PRIVATE_VIDEO_PATH,
  PUBLIC_VIDEO_PATH,
  type PublicVideo,
  type Video,
  listVideos,
} from '../videos'
import { reactiveElement } from '../common'
import {
  atAgent,
  fileSystem,
  isConnectedToATProto,
  isConnectedToStoracha,
  setVideos,
  videos,
} from '../signals'
import { PROVIDERS } from '../providers'
import { Pages } from '../routing'

/**
 *
 */
export function YourVideos() {
  // Load video list & update it when the source changes
  effect(async () => {
    const fs = fileSystem()

    fs.off('commit', onCommit)
    fs.on('commit', onCommit)
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
 * @param root0
 * @param root0.modifications
 */
async function onCommit({ modifications }: Events['commit']) {
  const videoListChanged = modifications.some((m) => m.path[1] === 'Videos')
  if (videoListChanged) setVideos(await listVideos())
}

/**
 *
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
    tags.span(
      {},
      text(
        isConnectedToStoracha() && isConnectedToATProto() && video.public
          ? ' / '
          : ''
      )
    ),
    isConnectedToStoracha() &&
    isConnectedToATProto() &&
    video.public &&
    video.cid !== undefined
      ? tags.a(
          {
            className: 'cursor-pointer',
            onclick:
              video.published.length > 0 ? unpublish(video) : publish(video),
          },
          text(video.published.length > 0 ? '🌋 UNPUBLISH' : '🦋 PUBLISH')
        )
      : tags.span({}, []),

    tags.span({}, text(isConnectedToStoracha() && video.public ? ' / ' : '')),
    isConnectedToStoracha() && video.public && video.cid !== undefined
      ? tags.a({ href: Pages.Video(video.cid).url }, text('🍿 WATCH'))
      : tags.span({}, []),
  ])
}

/**
 *
 * @param video
 */
function publish(video: PublicVideo) {
  return async () => {
    const agent = atAgent()
    if (agent.did === undefined) return

    const did = agent.assertDid

    await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: 'ma.tokono.byov.video',
      record: {
        $type: 'ma.tokono.byov.video',
        id: video.id,
        cid: video.cid,
        serviceProdiver: PROVIDERS.STORACHA,
        title: prompt('Video title:', video.name),
        createdAt: new Date().toISOString(),
      },
    })

    setVideos(await listVideos())
  }
}

/**
 *
 * @param video
 */
function unpublish(video: PublicVideo) {
  return async () => {
    const agent = atAgent()
    if (agent.did === undefined) return

    const did = agent.assertDid
    const promises = video.published.map(async (rec) => {
      const uri = new AtUri(rec.uri)
      await agent.com.atproto.repo.deleteRecord({
        repo: did,
        collection: 'ma.tokono.byov.video',
        rkey: uri.rkey,
      })
    })

    await Promise.all(promises)

    setVideos(await listVideos())
  }
}
