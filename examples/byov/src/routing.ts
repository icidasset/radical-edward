import { signal } from 'spellcaster'

// 🏡

export const Pages = {
  AllVideos: { id: 'all-videos', url: () => '/' },
  MyChannel: { id: 'my-channel', url: () => '/me/' },
  UploadVideo: { id: 'upload-video', url: () => '/upload/' },
}

// 🔮

export const [page, setPage] = signal(initialPage())

// 🛠️

/**
 *
 */
export function initialPage() {
  return pageFromPath(window.location.pathname) ?? 'all-videos'
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
  switch (path) {
    case '/': {
      return Pages.AllVideos.id
    }
    case '/me/': {
      return Pages.MyChannel.id
    }
  }
}
