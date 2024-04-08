import * as IDB from 'idb-keyval'

import { base64url } from 'iso-base/rfc4648'
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
        largeBlob: {
          support: 'required',
        },
      },
    },
  })

  if (credential.clientExtensionResults.largeBlob?.supported !== true)
    return {
      supported: false,
      reason: 'This browser does not support the Webauthn large-blob extension',
    }

  await IDB.set('passkeys', [credential])
  return { supported: true, credential }
}

// GET

/**
 *
 * @param root0
 * @param root0.blob
 * @param root0.mediation
 */
export async function get({
  blob,
  mediation,
}: {
  blob?: Uint8Array
  mediation?: CredentialMediationRequirement
}): Promise<
  | {
      supported: true
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
      rpId: rp.id,
      extensions: {
        largeBlob: blob === undefined ? { read: true } : { write: blob },
      },
    },
  })

  if (
    assertion.clientExtensionResults.largeBlob?.blob === undefined &&
    assertion.clientExtensionResults.largeBlob?.written === undefined
  )
    return {
      supported: false,
      reason: 'This browser does not support the Webauthn large-blob extension',
    }

  return {
    supported: true,
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
