# MAAKE-OOB

[![npm (scoped)](https://img.shields.io/npm/v/maake-oob)](https://www.npmjs.com/package/maake-oob)

Create a secure tunnel between two parties using a mutually authenticating AKE with out-of-band parameters.

## Cryptography

- X25519 to establish a shared secret.
- SHA256 to hash the rotating nonce.
- HKDF to derive stronger key material.
- XChaCha20-Poly1305 as the AEAD constructor.
- Random 128-bit challenge.

## Installation

```bash
npm install maake-oob
```

## Usage

First we set up the provider, the party who provides the out-of-band parameters.

```js
const provider = new Provider()
```

Both the provider and the consumer will need to share the same transport. This is a [`@fission-codes/channel`](https://www.npmjs.com/package/@fission-codes/channel) `Transport`. For example, here we use the [partykit-transport](https://www.npmjs.com/package/partykit-transport) which uses [partykit.io](https://partykit.io/) as the transport for the channel.

```js
const transport = new Transport({
  peerId: provider.id,
  room: provider.params.publicKey,
  host: HOST,
})
```

Listen for events on the provider side:

```js
provider.on('new-consumer', async ({ did, answer, send }) => {
  console.log('Secure tunnel established with', did)
})

provider.on('message', async ({ did, msgId, payload }) => {
  console.log('Provider got message from', did)
})
```

Finish the provider setup & listen for handshake:

```js
await provider.provide({
  payloadDecoder(encoded: Uint8Array): Payload { return payload },
  payloadEncoder(payload: Payload): Uint8Array { return encoded },
  transport,
})
```

Now that that's done we need to get the out-of-band parameters to the other party somehow.
One way to do that is by putting them in a URL:

```js
const url = new URL(location.href)
url.searchParams.set('challenge', provider.params.challenge)
url.searchParams.set('publicKey', provider.params.publicKey)
url.toString()
```

You can use a QR code to get URL easily on a mobile device.
Next, we extract the parameters from the URL and create a consumer with them.

```js
const url = new URL(location.href)
const challenge = url.searchParams.get('challenge')
const publicKey = url.searchParams.get('publicKey')

const consumer = new Consumer({ challenge, publicKey })
```

Listen for events on the consumer side:

```js
consumer.on('message', ({ did, msgId, payload }) => {
  console.log('Consumer got message from', did)
})
```

Finish the consumer setup & initiate handshake (using the same arguments as with the provider):

```js
const { answer, send } = await consumer.consume({
  payloadDecoder: decoder,
  payloadEncoder: encoder,
  transport,
})
```

Once this `await` finishes, the secure tunnel is established.
Now you can `send` & `answer` messages.

```js
// Consumer
const response = await send(messageId, payloadThatWillBeEncodedAndEncrypted)

if (response.error) {
  throw response.error
} else {
  const decryptedAndDecoded = response.result
}

// Producer:
//   You can get the `msgId` from the message event.
answer(sameMessageIdTheConsumerUsed, anotherPayload)
```

### Typescript

The type of your payload should be passed to the provider and consumer constructors.

```ts
type Payload = string

new Provider<Payload>()
new Consumer<Payload>()

function payloadDecoder(encoded: Uint8Array): Payload {
  return new TextDecode().decode(encoded)
}

function payloadEncoder(payload: Payload): Uint8Array {
  return new TextEncoder().encode(payload)
}
```

## Docs

Check <https://icidasset.github.io/radical-edward>

## Contributing

Read contributing guidelines [here](../../.github/CONTRIBUTING.md).

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/icidasset/radical-edward)

## License

This project is licensed under either of

- Apache License, Version 2.0, ([LICENSE-APACHE](../../LICENSE-APACHE) or
  [http://www.apache.org/licenses/LICENSE-2.0][apache])
- MIT license ([LICENSE-MIT](../../LICENSE-MIT) or
  [http://opensource.org/licenses/MIT][mit])

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in the work by you, as defined in the Apache-2.0
license, shall be dual licensed as above, without any additional terms or
conditions.

[apache]: https://www.apache.org/licenses/LICENSE-2.0
[mit]: http://opensource.org/licenses/MIT
