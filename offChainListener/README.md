# Bridge Listener Service

A Node.js service that monitors Bitcoin ordinal transfers to bridge addresses and mints corresponding NFTs on EVM chains.

## Features

- Monitors ordinal transfers to specified bridge addresses
- Automatically checks for updates every 10 minutes
- Uses the Hiro Ordinals API to fetch inscription details
- Mints corresponding NFTs on EVM chains when ordinals are received
- Maintains a queue of bridge requests with their current status

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Copy `.env.example` to `.env` and fill in the required values:
- `BRIDGE_CONTRACT_ADDRESS`: The address of your bridge contract
- `BRIDGE_CONTRACT_ABI_PATH`: Path to your bridge contract ABI
- `RPC_URL`: Your EVM chain RPC URL
- `CHAIN_ID`: Your EVM chain ID
- `PRIVATE_KEY`: Private key for the account that will mint NFTs

3. Build the TypeScript code:
```bash
npm run build
```

## Usage

1. Start the service:
```bash
npm start
```

2. Add bridge requests programmatically:
```typescript
import BridgeListener from './bridgeListener';

const bridgeListener = new BridgeListener();

bridgeListener.addBridgeRequest(
  'inscriptionId',
  'userEvmAddress',
  'bridgeBtcAddress'
);
```

## Bridge Request Status

Bridge requests can have the following statuses:
- `pending`: The request is waiting for the ordinal to be transferred
- `completed`: The ordinal was received and the NFT was minted
- `failed`: The request failed (e.g., inscription not found)

## Development

The service is built with TypeScript and uses:
- `axios` for API calls
- `node-cron` for scheduling checks
- `ethers` for blockchain interactions
- `dotenv` for environment configuration

To modify the check interval, update the cron schedule in `bridgeListener.ts`.

## Error Handling

The service includes error handling for:
- API errors
- Invalid inscriptions
- Failed NFT minting
- Network issues

All errors are logged to the console with relevant details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 