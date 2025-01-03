import type { Agent } from '@atproto/api'
import type {
  Record,
  Response,
} from '@atproto/api/src/client/types/com/atproto/repo/listRecords'
import type { Path } from '@wnfs-wg/nest'
import { atAgent, fileSystem } from './signals'

export const PUBLIC_VIDEO_PATH: Path.PartitionedNonEmpty<Path.Public> = [
  'public',
  'Videos',
]

export const PRIVATE_VIDEO_PATH: Path.PartitionedNonEmpty<Path.Private> = [
  'private',
  'Videos',
]

export interface PublicVideo {
  id: string
  cid: string
  name: string
  public: true
  published: Record[]
  url: string
}

export interface PrivateVideo {
  id: string
  name: string
  public: false
}

export type Video = PublicVideo | PrivateVideo

/**
 *
 */
export async function listVideos(): Promise<Video[]> {
  const fs = fileSystem()

  // ATProto
  const agent = atAgent()
  let published: Record[] = []

  if (agent !== undefined) {
    published = await listPublished(agent)
    console.log(published)
  }

  // File system
  const publ = (await fs.exists(PUBLIC_VIDEO_PATH))
    ? await fs.listDirectory(PUBLIC_VIDEO_PATH)
    : []
  const priv = (await fs.exists(PRIVATE_VIDEO_PATH))
    ? await fs.listDirectory(PRIVATE_VIDEO_PATH)
    : []

  const publWithNames = await Promise.all(
    publ.map(async (v): Promise<PublicVideo | undefined> => {
      const name = (await fs.exists([...PUBLIC_VIDEO_PATH, v.name, 'name.txt']))
        ? await fs.read([...PUBLIC_VIDEO_PATH, v.name, 'name.txt'], 'utf8')
        : await fs
            .ls([...PUBLIC_VIDEO_PATH, v.name])
            .then((a) => a[0]?.name ?? '')

      const ext = name.match(/\.([^$]+)/)?.[1]
      const cid = await fs
        .contentCID([
          ...PUBLIC_VIDEO_PATH,
          v.name,
          `video${ext === undefined ? '' : '.' + ext}`,
        ])
        .then((c) => (c === undefined ? undefined : c.toString()))

      if (cid === undefined) return undefined

      const pblsh = published.filter((a) => (a.value as any).cid === cid)

      return {
        id: v.name,
        cid,
        name,
        public: true,
        published: pblsh,
        url: `https://w3s.link/ipfs/${cid}`,
      }
    })
  )

  const privWithNames = await Promise.all(
    priv.map(
      async (v): Promise<PrivateVideo> => ({
        id: v.name,
        public: false,
        name: (await fs.exists([...PRIVATE_VIDEO_PATH, v.name, 'name.txt']))
          ? await fs.read([...PRIVATE_VIDEO_PATH, v.name, 'name.txt'], 'utf8')
          : '',
      })
    )
  )

  const videos = [
    ...publWithNames.filter((a): a is PublicVideo => a !== undefined),
    ...privWithNames,
  ]
  return videos
}

/**
 *
 * @param agent
 * @param cursor
 */
async function listPublished(agent: Agent, cursor?: string): Promise<Record[]> {
  return await agent.com.atproto.repo
    .listRecords({
      repo: agent.assertDid,
      collection: 'ma.tokono.byov.video',
      cursor,
      limit: 100,
    })
    .then(async (resp: Response) => {
      if (resp.data.cursor !== undefined)
        return await listPublished(agent, resp.data.cursor).then(
          (records: Record[]) => [...resp.data.records, ...records]
        )

      return resp.data.records
    })
}
