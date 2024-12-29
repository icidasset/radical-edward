import { tags } from 'spellcaster/hyperscript.js'

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

// TODO:
// * Upload video to private folder
// * List all private & public videos in one list
// * Add ability to make a video public or private
// * Stream a video (private or public)
// * Use ed25519 public key from passkey as FS identifier

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
      switch (page()) {
        case 'all-videos': {
          return AllVideos()
        }
        case 'my-channel': {
          return MyChannel()
        }
        default: {
          return tags.span({}, [])
        }
      }
    })
  )
}

// PAGE :: ALL VIDEOS

/**
 *
 */
function AllVideos() {
  return tags.div({}, [YourSubscriptions(), VideosOnBluesky()])
}

// PAGE :: MY CHANNEL

/**
 *
 */
function MyChannel() {
  return tags.div({}, [
    ConnectStoracha(),
    ConnectAtProto(),
    YourVideos(),
    UploadVideo(),
  ])
}
