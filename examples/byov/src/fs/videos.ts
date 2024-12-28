import type { Path } from '@wnfs-wg/nest'
import { fileSystem } from '../signals'

export const PUBLIC_VIDEO_PATH: Path.PartitionedNonEmpty<Path.Public> = [
  'public',
  'Videos',
]

export const PRIVATE_VIDEO_PATH: Path.PartitionedNonEmpty<Path.Private> = [
  'private',
  'Videos',
]

export interface Video {
  id: string
  name: string
  public: boolean
  url?: string
}

/**
 *
 */
export async function listVideos(): Promise<Video[]> {
  const fs = fileSystem()

  const publ = (await fs.exists(PUBLIC_VIDEO_PATH))
    ? await fs.listDirectory(PUBLIC_VIDEO_PATH)
    : []
  const priv = (await fs.exists(PRIVATE_VIDEO_PATH))
    ? await fs.listDirectory(PRIVATE_VIDEO_PATH)
    : []

  const publWithNames = await Promise.all(
    publ.map(async (v) => {
      const name = (await fs.exists([...PUBLIC_VIDEO_PATH, v.name, 'name.txt']))
        ? await fs.read([...PUBLIC_VIDEO_PATH, v.name, 'name.txt'], 'utf8')
        : ''

      const ext = name.match(/\.([^$]+)/)?.[1]
      const cid = await fs.contentCID([
        ...PUBLIC_VIDEO_PATH,
        v.name,
        `video${ext === undefined ? '' : '.' + ext}`,
      ])

      return {
        id: v.name,
        public: true,
        url:
          cid === undefined
            ? undefined
            : `https://w3s.link/ipfs/${cid.toString()}`,
        name,
      }
    })
  )

  const privWithNames = await Promise.all(
    priv.map(async (v) => ({
      id: v.name,
      public: false,
      name: (await fs.exists([...PRIVATE_VIDEO_PATH, v.name, 'name.txt']))
        ? await fs.read([...PRIVATE_VIDEO_PATH, v.name, 'name.txt'], 'utf8')
        : '',
    }))
  )

  const videos = [...publWithNames, ...privWithNames]
  return videos
}
