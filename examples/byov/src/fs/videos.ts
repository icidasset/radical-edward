import type { FileSystem, Path } from '@wnfs-wg/nest'

const PUBLIC_VIDEO_PATH: Path.PartitionedNonEmpty<Path.Public> = [
  'public',
  'Videos',
]
const PRIVATE_VIDEO_PATH: Path.PartitionedNonEmpty<Path.Private> = [
  'private',
  'Videos',
]

/**
 *
 * @param fs
 */
export async function listVideos(fs: FileSystem) {
  const publ = (await fs.exists(PUBLIC_VIDEO_PATH))
    ? await fs.listDirectory(PUBLIC_VIDEO_PATH)
    : []
  const priv = (await fs.exists(PRIVATE_VIDEO_PATH))
    ? await fs.listDirectory(PRIVATE_VIDEO_PATH)
    : []

  return [
    ...publ.map((v) => ({ name: v.name, public: true })),
    ...priv.map((v) => ({ name: v.name, public: false })),
  ]
}
