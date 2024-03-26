# Radical Edward

Radical packages that can be used to make distributed web apps. While some are completely generic, others are built with [WNFS](https://github.com/wnfs-wg/) and [UCAN](https://github.com/ucan-wg/) in mind.

![](https://i.pinimg.com/736x/49/c8/d4/49c8d4ac8b632a0fe2661cb4006fba32--purple-shorts-gif-art.jpg)

## Packages

- [maake-oob](https://github.com/icidasset/radical-edward/tree/main/packages/maake-oob) - Create a secure tunnel between two parties using a mutually authenticating AKE with out-of-band parameters.
- [partykit-transport](https://github.com/icidasset/radical-edward/tree/main/packages/partykit-transport) - A transport implementation for the @fission-codes/channel library which uses [partykit.io](https://partykit.io).
- [w3-wnfs](https://github.com/icidasset/radical-edward/tree/main/packages/w3-wnfs) - Provides the necessary components to use WNFS with Web3Storage.

## Examples

- [`demo`](https://github.com/icidasset/radical-edward/tree/main/examples/demo) - A simple demo of how the `maake-oob` and `partykit-transport` packages are used.
- [`w3-wnfs`](https://github.com/icidasset/radical-edward/tree/main/examples/w3-wnfs) - An example app that shows how to store a WNFS on Web3Storage using the `@wnfs-wg/nest` package and some of the packages from this repo.

### Checkout examples

You can use Codesandbox <https://githubbox.com/icidasset/radical-edward/tree/main/examples/demo> and start hacking right away.

To clone it locally:

```bash
npx tiged icidasset/radical-edward/examples/demo demo
cd demo
pnpm install
pnpm dev
```

You can try any of the examples by replacing `demo` with the name of the example you want to try.

## Contributing

Read contributing guidelines [here](.github/CONTRIBUTING.md).

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/icidasset/radical-edward)

## License

This project is licensed under either of

- Apache License, Version 2.0, ([LICENSE-APACHE](./LICENSE-APACHE) or
  [http://www.apache.org/licenses/LICENSE-2.0][apache])
- MIT license ([LICENSE-MIT](./LICENSE-MIT) or
  [http://opensource.org/licenses/MIT][mit])

at your option.

### Contribution

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in the work by you, as defined in the Apache-2.0
license, shall be dual licensed as above, without any additional terms or
conditions.

[apache]: https://www.apache.org/licenses/LICENSE-2.0
[mit]: http://opensource.org/licenses/MIT
