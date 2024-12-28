import { signal } from 'spellcaster'

import type { Video } from './fs/videos'

export { page, setPage } from './routing'
export const [isUploading, setIsUploading] = signal(false)
export const [videos, setVideos] = signal<'loading' | Video[]>([])
