import type { FileSystem } from '@wnfs-wg/nest'
import { tags, text } from 'spellcaster/hyperscript.js'

/**
 *
 * @param fs
 */
export function UploadVideo(fs: FileSystem) {
  return tags.div(
    {
      className:
        'border-2 border-dashed border-stone-700 flex flex-col items-center h-48 justify-center  text-stone-600 rounded-lg',
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
          className: 'block mt-2',
          type: 'file',
          onchange: inputHandler(fs),
        },
        text('browse for your videos')
      ),
    ]
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
  const promises = files.map(async (file: File) => {
    const uuid = crypto.randomUUID()
    const bytes = new Uint8Array(await file.arrayBuffer())
    const ext = file.name.match(/\.([^$]+)/)?.[1]

    console.log(ext, bytes)

    await fs.write(
      ['private', 'Videos', uuid, `video${ext === undefined ? '' : '.' + ext}`],
      'bytes',
      bytes
    )
  })

  await Promise.all(promises)

  console.log('Upload success')
}
