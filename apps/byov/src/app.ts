import { tags, text } from 'spellcaster/hyperscript.js'

import * as Routing from './routing'
import { PageNav } from './components/page-nav'
import { YourSubscriptions } from './components/your-subscriptions'
import { VideosOnBluesky } from './components/videos-on-bluesky'
import { reactiveElement } from './common'
import { YourVideos } from './components/your-videos'
import { page } from './signals'
import { UploadVideo } from './components/upload-video'
import { ConnectStoracha } from './components/connect-storacha'
import { ConnectAtProto } from './components/connect-atproto'
import { Video } from './components/video'
import { Channel } from './components/channel'

// 🏡

/**
 *
 */
export async function init(): Promise<void> {
  Routing.intercept()

  const pageNav = document.querySelector('#page-nav')
  if (pageNav !== null) pageNav.replaceWith(PageNav())

  const main = document.querySelector('#app')
  if (main !== null) main.replaceWith(App())
}

/**
 *
 */
function App() {
  return tags.div(
    {},
    reactiveElement(() => {
      const p = page()

      switch (p.id) {
        case 'all-videos': {
          return AllVideos()
        }
        case 'channel': {
          return Channel(p.profileDID)
        }
        case 'my-videos': {
          return MyVideos()
        }
        case 'video': {
          return Video(p.videoCID)
        }
        default: {
          return tags.span({}, text('Page not found.'))
        }
      }
    })
  )
}

// PAGES

/**
 *
 */
function AllVideos() {
  return tags.div({}, [YourSubscriptions(), VideosOnBluesky()])
}

/**
 *
 */
function MyVideos() {
  return tags.div({}, [
    tags.div(
      {
        className: 'text-center',
      },
      [ConnectStoracha(), ConnectAtProto()]
    ),
    YourVideos(),
    UploadVideo(),
  ])
}
