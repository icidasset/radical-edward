# Partykit Transport

[![npm (scoped)](https://img.shields.io/npm/v/partykit-transport)](https://www.npmjs.com/package/partykit-transport)

A `Transport` implementation for the [@fission-codes/channel](https://github.com/fission-codes/stack/tree/main/packages/channel) library which uses [partykit.io](https://partykit.io).

## Installation

```bash
pnpm install partykit-transport
```

## Usage

```js
const _transport = new Transport({
  peerId: 'example-id',
  room: 'example-room',
  host: 'partykit-host.address',
})
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
