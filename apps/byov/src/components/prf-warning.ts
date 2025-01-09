import { tags, text } from 'spellcaster/hyperscript.js'
import * as Passkey from '../passkey'

/**
 *
 */
export function PrfWarning() {
  return tags.div(
    {
      className:
        'bg-amber-900 mb-12 px-4 py-6 rounded text-center text-amber-400 text-sm',
    },
    [
      tags.p({ className: 'max-w-3xl mb-4 mx-auto' }, [
        tags.span(
          {},
          text('⚠️ Uploading videos requires your browser to support the ')
        ),
        tags.strong({}, text('PRF extension')),
        tags.span(
          {},
          text(
            ' for Passkeys, a very recent addition to modern browsers, so your files can be encrypted. Note that support also depends on the authentication method used. '
          )
        ),
        tags.a(
          {
            className: 'border-b-2 border-current',
            href: 'https://bitwarden.com/blog/prf-webauthn-and-its-role-in-passkeys/',
          },
          text('More info')
        ),
        tags.span({}, text('.')),
      ]),
      tags.p({}, [
        tags.button(
          {
            className: 'bg-amber-400 text-amber-900',
            onclick: async () => {
              if (
                confirm('Register new passkey? Cancel to reuse old passkey.')
              ) {
                await Passkey.create({
                  uniqueId: 'BYOV FileSystem',
                })
              }

              const passkey = await Passkey.get()

              if (passkey.supported) {
                alert('✅ The PRF extension is supported!')
              } else {
                alert('❌ The PRF extension is NOT supported!')
              }
            },
          },
          text('Check for PRF support')
        ),
      ]),
    ]
  )
}
