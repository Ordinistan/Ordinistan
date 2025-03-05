# Ordinistan: Optimistic Bridging and NFT Marketplace on Core Blockchain

## Overview

Ordinistan is a revolutionary platform that bridges Bitcoin Ordinals to Core Blockchain through an optimistic bridging solution, coupled with a comprehensive NFT marketplace. The project leverages Bitcoin's security and immutability while utilizing Core Blockchain's speed and scalability for efficient NFT trading.

## Key Features

### Optimistic Bridging
- **Lock-and-Mint Mechanism**: Lock Ordinals on Bitcoin L1 and mint representations on Core DAO
- **Time-Based Expiry**: Ordinals minted on Core include expiry mechanisms based on Bitcoin timelocks
- **Burn-and-Unlock Mechanism**: Burn representations on Core to unlock original assets on Bitcoin
- **Light Client Verification**: Efficient verification of Bitcoin transactions without requiring a full node

### NFT Marketplace
- **Trading**: Buy, sell, and trade Ordinals NFTs using Core's native token or supported stablecoins
- **Creator Royalties**: Automated royalties for creators on every secondary sale
- **Fractional Ownership**: Enable fractional trading of high-value Ordinals NFTs
- **Bridge Integration**: Only verified Ordinals NFTs minted through the bridge are eligible for trading

## Technical Architecture

1. **Light Client Verification**
   - SPV-based verification of Bitcoin transactions
   - Minimal state storage on Core DAO

2. **Lock Script on Bitcoin L1**
   - Includes Ordinals NFT, destination address, and timelock
   - Generates unique proof for minting on Core DAO

3. **Bridge Smart Contract on Core DAO**
   - Manages minting, burning, and dispute resolution
   - Implements challenge periods for optimistic security

4. **Expiry Mechanism**
   - Each minted Ordinal includes an expiry timestamp
   - Users can extend timelocks or burn and re-mint NFTs

5. **Marketplace Smart Contract**
   - Standard marketplace functionality with expiry-aware trading logic
   - Integration with the bridge for verification

## Project Status

The project currently has a working implementation of the NFT marketplace smart contracts, which can be tested using Hardhat. The marketplace supports:

- ERC721 and ERC1155 NFT standards
- Native ETH and ERC20 token payments
- Bidding and instant buy functionality
- Platform fees and creator royalties
- Upgradeable smart contracts

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation


## Smart Contracts

The project includes the following key smart contracts:

- **OrdMarketPlace**: The main marketplace contract for listing and trading NFTs
- **ERC721Collection**: Standard for non-fungible tokens
- **ERC1155Collection**: Standard for semi-fungible tokens
- **ERC721Factory & ERC1155Factory**: Factories for creating new collections


## Economic Incentives

- **Relayers**: Earn fees for submitting valid proofs
- **Validators**: Earn rewards for successful challenges
- **Users**: Low fees and seamless bridging experience
