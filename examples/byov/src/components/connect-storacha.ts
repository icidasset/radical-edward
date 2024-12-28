import type * as w3up from '@web3-storage/w3up-client'
import { tags, text } from 'spellcaster/hyperscript.js'
import { base64url } from 'iso-base/rfc4648'

import * as Crypto from '../crypto'
import * as Passkey from '../passkey'

/**
 *
 * @param client
 */
export function ConnectStoracha(client: w3up.Client) {
  return tags.div(
    {
      className: 'border-b border-stone-800 mb-12 pb-12 text-center',
    },
    [
      tags.button(
        {
          onclick: async (event: Event) => {
            // SIGN UP:
            // 1. LOGIN WITH EMAIL
            // 2. WAIT FOR PAYMENT PLAN
            // 3. LIST SPACES & CHECK IF SPACE ALREADY EXISTS
            // 4. CREATE SPACE IF NEEDED
            // 5. PROVISION SPACE (PASS ACCOUNT TO AUTOMATICALLY CREATE RECOVERY)
            // 6. LINK FS WITH PASSKEY ED25519 ED (TRIGGERS SYNC WITH STORACHA)

            if (confirm('Register new passkey?')) {
              await Passkey.create({
                uniqueId: 'BYOV FileSystem',
              })
            }

            const passkey = await Passkey.get()

            if (!passkey.supported) {
              alert(
                'Your browser does not support the PRF extension for passkeys.'
              )
              return
            }

            // const email = prompt("What's your email address? (Storacha account)")
            // if (email === null) return

            // const emailMatches = email.match(/\w+@\w+\.\w+/)
            // if (emailMatches === null) return
            // if (event.target === null) return

            // const target = event.target as HTMLElement
            // target.textContent = '🌶️ Connecting ...'

            // await client.login(email as `${string}@${string}`)

            // const spaces = client.spaces()
            // console.log(spaces)

            const signingKey = Crypto.buildSigningKey(passkey.results.first)
            const pubKey = base64url.encode(signingKey.public)

            console.log(pubKey)
          },
        },
        text('🌶️ Connect with Storacha')
      ),
    ]
  )
}
