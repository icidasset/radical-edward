import type { CID } from 'multiformats'

export interface Block {
  cid: CID
  bytes: Uint8Array
}

export interface BlockWithCIDString {
  cid: string
  bytes: Uint8Array
}
