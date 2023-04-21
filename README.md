![Matchmaker logo](assets/logo.png)

![Build Status](https://github.com/openrbw/bot/actions/workflows/ci.yml/badge.svg)

## Features

* Multi-guild support
* Parties
* Factions
* Custom modes
* Support for multiple games
* Automatic scoring with Tesseract OCR

## Requirements

* Tesseract
* `Server Members` Intent
* Node.js 18.0.0+

## Setup

1. Clone the repository

```bash
git clone git@github.com:openrbw/bot.git
```

2. Install dependencies

```bash
pnpm install
# or
yarn install
# or
npm install
```

3. Modify the [configuration file](./src/config.ts)

4. Modify the `.env` file

```bash
cp .env.example .env
```

5. Run the bot

```bash
pnpm start
# or
yarn start
# or
npm start
```
