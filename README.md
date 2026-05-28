<a href="https://drawboard.com/" target="_blank" rel="noopener">
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Drawboard" srcset="https://drawboard.nyc3.cdn.digitaloceanspaces.com/github/drawboard_github_cover_2_dark.png" />
    <img alt="Drawboard" src="https://drawboard.nyc3.cdn.digitaloceanspaces.com/github/drawboard_github_cover_2.png" />
  </picture>
</a>

<h4 align="center">
  <a href="https://drawboard.com">Drawboard Editor</a> |
  <a href="https://plus.drawboard.com/blog">Blog</a> |
  <a href="https://docs.drawboard.com">Documentation</a> |
  <a href="https://plus.drawboard.com">Drawboard+</a>
</h4>

<div align="center">
  <h2>
    An open source virtual hand-drawn style whiteboard. </br>
    Collaborative and end-to-end encrypted. </br>
  <br />
  </h2>
</div>

<br />
<p align="center">
  <a href="https://github.com/drawboard/drawboard/blob/master/LICENSE">
    <img alt="Drawboard is released under the MIT license." src="https://img.shields.io/badge/license-MIT-blue.svg"  /></a>
  <a href="https://www.npmjs.com/package/@drawboard/drawboard">
    <img alt="npm downloads/month" src="https://img.shields.io/npm/dm/@drawboard/drawboard"  /></a>
  <a href="https://docs.drawboard.com/docs/introduction/contributing">
    <img alt="PRs welcome!" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat"  /></a>
  <a href="https://discord.gg/UexuTaE">
    <img alt="Chat on Discord" src="https://img.shields.io/discord/723672430744174682?color=738ad6&label=Chat%20on%20Discord&logo=discord&logoColor=ffffff&widge=false"/></a>
  <a href="https://deepwiki.com/drawboard/drawboard">
    <img alt="Ask DeepWiki" src="https://deepwiki.com/badge.svg" /></a>
  <a href="https://twitter.com/drawboard">
    <img alt="Follow Drawboard on Twitter" src="https://img.shields.io/twitter/follow/drawboard.svg?label=follow+@drawboard&style=social&logo=twitter"/></a>
</p>

<div align="center">
  <figure>
    <a href="https://drawboard.com" target="_blank" rel="noopener">
      <img src="https://drawboard.nyc3.cdn.digitaloceanspaces.com/github%2Fproduct_showcase.png" alt="Product showcase" />
    </a>
    <figcaption>
      <p align="center">
        Create beautiful hand-drawn like diagrams, wireframes, or whatever you like.
      </p>
    </figcaption>
  </figure>
</div>

## Features

The Drawboard editor (npm package) supports:

- 💯&nbsp;Free & open-source.
- 🎨&nbsp;Infinite, canvas-based whiteboard.
- ✍️&nbsp;Hand-drawn like style.
- 🌓&nbsp;Dark mode.
- 🏗️&nbsp;Customizable.
- 📷&nbsp;Image support.
- 😀&nbsp;Shape libraries support.
- 🌐&nbsp;Localization (i18n) support.
- 🖼️&nbsp;Export to PNG, SVG & clipboard.
- 💾&nbsp;Open format - export drawings as an `.drawboard` json file.
- ⚒️&nbsp;Wide range of tools - rectangle, circle, diamond, arrow, line, free-draw, eraser...
- ➡️&nbsp;Arrow-binding & labeled arrows.
- 🔙&nbsp;Undo / Redo.
- 🔍&nbsp;Zoom and panning support.

## Drawboard.com

The app hosted at [drawboard.com](https://drawboard.com) is a minimal showcase of what you can build with Drawboard. Its [source code](https://github.com/drawboard/drawboard/tree/master/drawboard-app) is part of this repository as well, and the app features:

- 📡&nbsp;PWA support (works offline).
- 🤼&nbsp;Real-time collaboration.
- 🔒&nbsp;End-to-end encryption.
- 💾&nbsp;Local-first support (autosaves to the browser).
- 🔗&nbsp;Shareable links (export to a readonly link you can share with others).

We'll be adding these features as drop-in plugins for the npm package in the future.

## Repository setup

This repository is a monorepo that uses Bun for scripts and Vite for the app.

```bash
bun install
```

Create a local env file in the repo root and add your Firebase config (see [FIREBASE_SETUP.md](file:///Users/mika/Code/drawboard/drawboard-app/FIREBASE_SETUP.md)).

```bash
VITE_APP_FIREBASE_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
```

Start the app:

```bash
bun start
```

For Vercel, set the same env vars in the project settings and avoid committing any `.env*.local` files.

## Quick start

**Note:** following instructions are for installing the Drawboard [npm package](https://www.npmjs.com/package/@drawboard/drawboard) when integrating Drawboard into your own app. To run the repository locally for development, please refer to our [Development Guide](https://docs.drawboard.com/docs/introduction/development).

Use `npm` or `yarn` to install the package.

```bash
npm install react react-dom @drawboard/drawboard
# or
yarn add react react-dom @drawboard/drawboard
```

Check out our [documentation](https://docs.drawboard.com/docs/@drawboard/drawboard/installation) for more details!

## Contributing

- Missing something or found a bug? [Report here](https://github.com/drawboard/drawboard/issues).
- Want to contribute? Check out our [contribution guide](https://docs.drawboard.com/docs/introduction/contributing) or let us know on [Discord](https://discord.gg/UexuTaE).
- Want to help with translations? See the [translation guide](https://docs.drawboard.com/docs/introduction/contributing#translating).

## Integrations

- [VScode extension](https://marketplace.visualstudio.com/items?itemName=pomdtr.drawboard-editor)
- [npm package](https://www.npmjs.com/package/@drawboard/drawboard)

## Who's integrating Drawboard

[Google Cloud](https://googlecloudcheatsheet.withgoogle.com/architecture) • [Meta](https://meta.com/) • [CodeSandbox](https://codesandbox.io/) • [Obsidian Drawboard](https://github.com/zsviczian/obsidian-drawboard-plugin) • [Replit](https://replit.com/) • [Slite](https://slite.com/) • [Notion](https://notion.so/) • [HackerRank](https://www.hackerrank.com/) • and many others

## Sponsors & support

If you like the project, you can become a sponsor at [Open Collective](https://opencollective.com/drawboard) or use [Drawboard+](https://plus.drawboard.com/).

## Thank you for supporting Drawboard

[<img src="https://opencollective.com/drawboard/tiers/sponsors/0/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/0/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/1/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/1/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/2/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/2/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/3/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/3/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/4/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/4/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/5/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/5/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/6/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/6/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/7/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/7/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/8/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/8/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/9/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/9/website) [<img src="https://opencollective.com/drawboard/tiers/sponsors/10/avatar.svg?avatarHeight=120"/>](https://opencollective.com/drawboard/tiers/sponsors/10/website)

<a href="https://opencollective.com/drawboard#category-CONTRIBUTE" target="_blank"><img src="https://opencollective.com/drawboard/tiers/backers.svg?avatarHeight=32"/></a>

Last but not least, we're thankful to these companies for offering their services for free:

[![Vercel](./.github/assets/vercel.svg)](https://vercel.com) [![Sentry](./.github/assets/sentry.svg)](https://sentry.io) [![Crowdin](./.github/assets/crowdin.svg)](https://crowdin.com)
