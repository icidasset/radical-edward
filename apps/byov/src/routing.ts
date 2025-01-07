import { signal } from 'spellcaster'

// 🏡

export interface AllVideos {
  id: 'all-videos'
  url: '/'
}

export interface Channel {
  id: 'channel'
  profileDID: string
  url: string
}

export interface MyVideos {
  id: 'my-videos'
  url: '/me'
}

export interface UploadVideo {
  id: 'upload-video'
  url: '/upload'
}

export interface Video {
  id: 'video'
  videoCID: string
  url: string
}

const PAGES_ALL_VIDEOS: AllVideos = { id: 'all-videos', url: '/' }
const PAGES_MY_VIDEOS: MyVideos = { id: 'my-videos', url: '/me' }
const PAGES_UPLOAD_VIDEO: UploadVideo = { id: 'upload-video', url: '/upload' }

const PAGES_CHANNEL: (did: string) => Channel = (did: string) => ({
  id: 'channel',
  profileDID: did,
  url: `/channel/${did}`,
})

const PAGES_VIDEO: (cid: string) => Video = (cid: string) => ({
  id: 'video',
  videoCID: cid,
  url: `/video/${cid}`,
})

export const Pages = {
  AllVideos: PAGES_ALL_VIDEOS,
  Channel: PAGES_CHANNEL,
  MyVideos: PAGES_MY_VIDEOS,
  UploadVideo: PAGES_UPLOAD_VIDEO,
  Video: PAGES_VIDEO,
}

// 🔮

export const [page, setPage] = signal(initialPage())

// 🛠️

/**
 *
 */
export function initialPage() {
  return pageFromPath(window.location.pathname) ?? Pages.AllVideos
}

/**
 *
 */
export function intercept() {
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
 * @param path
 */
export function pageFromPath(path: string) {
  const parts = path.replace(/(^\/|\/$)/, '').split('/')

  switch (parts[0]) {
    case '': {
      return Pages.AllVideos
    }
    case 'channel': {
      return Pages.Channel(parts[1])
    }
    case 'me': {
      return Pages.MyVideos
    }
    case 'video': {
      return Pages.Video(parts[1])
    }
  }
}
