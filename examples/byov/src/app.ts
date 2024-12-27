import type * as w3up from '@web3-storage/w3up-client'
import type { Blockstore, Tracker } from 'w3-wnfs'

import { type FileSystem } from '@wnfs-wg/nest'
import { tags } from 'spellcaster/hyperscript.js'

import * as Routing from './routing'
import { PageNav } from './components/page-nav'
import { YourSubscriptions } from './components/your-subscriptions'
import { VideosOnBluesky } from './components/videos-on-bluesky'
import { reactiveElement } from './common'
import { YourVideos } from './components/your-videos'
import { page } from './signals'
import { UploadVideo } from './components/upload-video'

// TODO:
// * Upload video to private folder
// * List all private & public videos in one list
// * Add ability to make a video public or private
// * Stream a video (private or public)
// * Use ed25519 public key from passkey as FS identifier

// 🏡

export interface Context {
  blockstore: Blockstore
  client: w3up.Client
  fs: FileSystem
  isAuthenticated: boolean
  tracker: Tracker
}

/**
 *
 * @param context
 */
export async function init(context: Context): Promise<void> {
  Routing.intercept()

  const pageNav = document.querySelector('#page-nav')
  if (pageNav !== null) pageNav.replaceWith(PageNav())

  const main = document.querySelector('#app')
  if (main !== null) main.replaceWith(App(context))
}

/**
 *
 * @param context
 * @param page
 */
function App(context: Context) {
  return tags.div(
    {},
    reactiveElement(() => {
      switch (page()) {
        case 'all-videos': {
          return AllVideos()
        }
        case 'my-channel': {
          return MyChannel(context)
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
 * @param context
 */
function MyChannel(context: Context) {
  return tags.div({}, [
    //
    YourVideos(context.fs),

    //
    UploadVideo(context.fs),
  ])
}
