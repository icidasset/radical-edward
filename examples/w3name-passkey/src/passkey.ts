import * as ED from '@noble/ed25519'
import * as IDB from 'idb-keyval'

import { base64url } from 'iso-base/rfc4648'
import { utf8 } from 'iso-base/utf8'
import { u8 } from 'iso-base/utils'
import { randomBytes } from 'iso-base/crypto'
import { credentialsCreate, credentialsGet } from 'iso-passkeys'

// CREATE

/**
 *
 * @param root0
 * @param root0.displayName
 * @param root0.uniqueId
 */
export async function create({
  displayName,
  uniqueId,
}: {
  displayName?: string
  uniqueId: string
}): Promise<
  | {
      supported: true
      credential: Awaited<ReturnType<typeof credentialsCreate>>
    }
  | { supported: false; reason: string }
> {
  const rp = relyingParty()
  const random128bitValue = randomBytes(16)

  const credential = await credentialsCreate({
    publicKey: {
      challenge: base64url.encode(rp.id),
      rp,
      user: {
        id: base64url.encode(random128bitValue),
        name: uniqueId,
        displayName: displayName ?? uniqueId,
      },
      attestation: 'none',
      authenticatorSelection: {
        userVerification: 'required',
        requireResidentKey: true,
        residentKey: 'required',
      },
      // pubKeyCredParams: see https://github.com/hugomrdias/iso-repo/blob/main/packages/iso-passkeys/src/parsing.js#L172C5-L172C21
      extensions: {
        credProps: true,
        prf: {
          eval: {
            first: utf8.decode(rp.id + 'signing').buffer,
          },
        },
      },
    },
  })

  if (credential.clientExtensionResults.prf?.enabled !== true)
    return {
      supported: false,
      reason: 'This browser does not support the Webauthn PRF extension',
    }

  await IDB.set('passkeys', [credential])
  return { supported: true, credential }
}

// GET

/**
 *
 * @param root0
 * @param root0.mediation
 */
export async function get({
  mediation,
}: {
  mediation?: CredentialMediationRequirement
}): Promise<
  | {
      supported: true
      publicKey: Uint8Array
      privateKey: Uint8Array
      userHandle: string | undefined
      assertion: Awaited<ReturnType<typeof credentialsGet>>
    }
  | {
      supported: false
      reason: string
    }
> {
  const rp = relyingParty()
  const credentials = await IDB.get('passkeys')

  const assertion = await credentialsGet({
    mediation,
    publicKey: {
      challenge: base64url.encode(rp.id),
      allowCredentials: mediation === 'conditional' ? [] : credentials,
      userVerification: 'discouraged',
      rpId: rp.id,
      extensions: {
        prf: {
          eval: {
            first: utf8.decode(rp.id + 'signing').buffer,
          },
        },
      },
    },
  })

  if (assertion.clientExtensionResults.prf?.results === undefined)
    return {
      supported: false,
      reason: 'This browser does not support the Webauthn PRF extension',
    }

  const secret1 = assertion.clientExtensionResults.prf.results.first
  const publicKey = await ED.getPublicKeyAsync(u8(secret1))

  return {
    supported: true,
    publicKey,
    privateKey: u8(secret1),
    userHandle: assertion.userHandle,
    assertion,
  }
}

// RP

/**
 *
 */
export function relyingParty(): { name: string; id: string } {
  const host = document.location.host
  const id = host.split(':')[0]

  return {
    name: id,
    id,
  }
}
