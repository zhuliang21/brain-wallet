# Brain Wallet

A secure brain wallet generator for Bitcoin that creates wallets from user-provided text input.

## Features

- Generate Bitcoin wallets from text input
- Support for multiple address formats (Legacy, SegWit, Taproot)
- Bilingual interface (English/Chinese)
- Check wallet usage against blockchain APIs
- Responsive design for mobile and desktop
- Offline-capable after initial load

## Security Notice

⚠️ **Important**: Brain wallets cannot provide sufficient randomness and are for educational/testing purposes only. Never use with real funds. Use sufficiently long and complex passphrases with high entropy.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Serve the application:
```bash
npm run serve
```

Then open `http://localhost:8080` in your browser.

## Usage

1. Enter a long, unique, and complex text (minimum 20 characters recommended)
2. Click "Generate Wallet" to create your brain wallet
3. View the generated mnemonic phrase, seed, and addresses
4. Optionally check wallet usage against blockchain APIs

## Technical Details

- Uses SHA256 hash of input text as entropy
- Generates BIP39 mnemonic phrases
- Supports BIP44/49/84/86 derivation paths
- Compatible with standard Bitcoin wallet software

## License

ISC