# TeraBox API

[![npm](https://img.shields.io/npm/v/%40cfbeg%2Fterabox-api?style=flat-square)](https://npmjs.com/package/@cfbeg/terabox-api)
[![npm downloads](https://img.shields.io/npm/dm/%40cfbeg%2Fterabox-api?style=flat-square)](https://npmjs.com/package/@cfbeg/terabox-api)

Node.js tool for interacting with the TeraBox cloud service without the website or app.

[View HTML Docs](./html)

Requires Node.js 22.19 or newer.

## Development

```sh
pnpm install
pnpm lint
pnpm test
```

Live smoke tests are opt-in. Create an ignored `.config.json`, then run `pnpm test:live`:

```json
{"accounts":{"main":"YOUR_NDUS_TOKEN"}}
```

The live test only mutates its uniquely named temporary directory. Account-wide operations such as clearing the recycle bin are never called.
