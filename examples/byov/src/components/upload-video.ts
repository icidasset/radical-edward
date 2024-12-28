import type { FileSystem } from '@wnfs-wg/nest'
import { tags, text } from 'spellcaster/hyperscript.js'
import { reactiveElement } from '../common'
import { isUploading, setIsUploading } from '../signals'

/**
 *
 * @param fs
 */
export function UploadVideo(fs: FileSystem) {
  const dropzone = tags.div(
    {
      className:
        'border-2 border-dashed border-stone-700 flex flex-col items-center h-48 justify-center overflow-hidden text-stone-600 rounded-lg',
      ondrop: dropHandler(fs),
      ondragover: (event: Event) => {
        event.preventDefault()
      },
    },
    [
      tags.span({}, text('Drag & drop your videos here, or:')),
      tags.input(
        {
          accept: 'video/*',
          className: 'inline-block mt-2',
          type: 'file',
          onchange: inputHandler(fs),
        },
        text('browse for your videos')
      ),
    ]
  )

  return tags.div(
    {},
    reactiveElement(() => {
      if (isUploading())
        return tags.div({ className: 'text-sm' }, text('UPLOADING VIDEOS ...'))

      return dropzone
    })
  )
}

/**
 *
 * @param fs
 */
function dropHandler(fs: FileSystem) {
  return async (event: DragEvent) => {
    event.preventDefault()

    const files: File[] =
      event.dataTransfer?.items === undefined
        ? [...(event.dataTransfer?.files ?? [])]
        : [...event.dataTransfer.items]
            .filter((i) => i.kind === 'file')
            .map((i) => i.getAsFile())
            .filter((i): i is File => i !== null)

    await uploadFiles(fs, files)
  }
}

/**
 *
 * @param fs
 */
function inputHandler(fs: FileSystem) {
  return async (event: InputEvent) => {
    if (event.target === null) return

    const input = event.target as HTMLInputElement
    if (input.files === null) return

    await uploadFiles(fs, [...input.files])
  }
}

/**
 *
 * @param fs
 * @param files
 */
async function uploadFiles(fs: FileSystem, files: File[]) {
  const timeoutId = setTimeout(() => {
    setIsUploading(true)
  }, 500)

  const promises = files.map(async (file: File) => {
    const uuid = crypto.randomUUID()
    const bytes = new Uint8Array(await file.arrayBuffer())
    const ext = file.name.match(/\.([^$]+)/)?.[1]

    if (!file.type.startsWith('video/')) {
      return
    }

    await fs.write(
      ['private', 'Videos', uuid, `video${ext === undefined ? '' : '.' + ext}`],
      'bytes',
      bytes
    )

    await fs.write(['private', 'Videos', uuid, 'name.txt'], 'utf8', file.name)
  })

  await Promise.all(promises)

  clearTimeout(timeoutId)
  setIsUploading(false)
}
