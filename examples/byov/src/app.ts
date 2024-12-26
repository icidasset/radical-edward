import type * as w3up from '@web3-storage/w3up-client'
import type { Blockstore, Tracker } from 'w3-wnfs'

import { type FileSystem } from '@wnfs-wg/nest'
import { type Signal, signal } from 'spellcaster/spellcaster.js'
import { tags } from 'spellcaster/hyperscript.js'

import { PageNav } from './components/page-nav'
import { YourSubscriptions } from './components/your-subscriptions'
import { VideosOnBluesky } from './components/videos-on-bluesky'
import { reactiveElement } from './common'

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
 * @param root0
 * @param root0.blockstore
 * @param root0.client
 * @param root0.fs
 * @param root0.isAuthenticated
 * @param root0.tracker
 */
export async function init({
  blockstore,
  client,
  fs,
  isAuthenticated,
  tracker,
}: Context): Promise<void> {
  const [page, setPage] = signal(initialPage())

  const pageNav = document.querySelector('#page-nav')
  if (pageNav !== null) pageNav.replaceWith(PageNav(page))

  const main = document.querySelector('#app')
  if (main !== null) main.replaceWith(App(page))

  // URL routing
  window.navigation.addEventListener('navigate', (event: NavigateEvent) => {
    const url = new URL(event.destination.url)

    event.intercept({
      async handler() {
        const page = pageFromPath(url.pathname)
        if (page !== undefined) setPage(page)
      },
    })
  })
}

/**
 *
 * @param page
 */
function App(page: Signal<string>) {
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

// ROUTING

/**
 *
 */
function initialPage() {
  return pageFromPath(window.location.pathname) ?? 'all-videos'
}

/**
 *
 * @param path
 */
function pageFromPath(path: string) {
  switch (path) {
    case '/': {
      return 'all-videos'
    }
    case '/me/': {
      return 'my-channel'
    }
  }
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
  return tags.div({}, [])
}
