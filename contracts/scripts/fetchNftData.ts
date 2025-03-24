import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * This script fetches data from the Bridge contract about NFTs
 * It reads both processedInscriptions and ordinalMetadata mappings
 * to understand what tokenIDs are stored on chain
 */
async function main() {
  console.log("Fetching NFT data from Bridge contract...");
  
  // Get the deployed Bridge contract
  const bridgeAddress = "0x13748584Ea70ddd16273aF9a4797836d9eb7e7AA"; // From deployments/sepolia/Bridge.json
  
  // Get the contract factory
  const Bridge = await ethers.getContractFactory("Bridge");
  const bridge = await Bridge.attach(bridgeAddress);
  
  console.log(`Connected to Bridge contract at ${bridgeAddress}`);
  
  // Check if the specified tokenID exists
  const tokenIdFromOpenSea = "89992152"; // Token ID displayed on OpenSea
  const tokenIdFromIndexer = "7136699956915747"; // Token ID from your indexer
  
  const results = {
    contract: bridgeAddress,
    tokenChecks: [],
    processedInscriptions: []
  };
  
  // Try to check both TokenIDs
  for (const tokenId of [tokenIdFromOpenSea, tokenIdFromIndexer]) {
    try {
      // Try to get owner of token
      const owner = await bridge.ownerOf(tokenId).catch(() => null);
      
      // Try to get metadata for this token if it exists
      let metadata = null;
      if (owner) {
        try {
          const rawMetadata = await bridge.ordinalMetadata(tokenId);
          metadata = {
            inscriptionId: rawMetadata.inscriptionId,
            inscriptionNumber: rawMetadata.inscriptionNumber.toString(),
            contentType: rawMetadata.contentType,
            contentLength: rawMetadata.contentLength.toString(),
            satOrdinal: rawMetadata.satOrdinal.toString(),
            satRarity: rawMetadata.satRarity,
            genesisTimestamp: rawMetadata.genesisTimestamp.toString(),
            bridgeTimestamp: rawMetadata.bridgeTimestamp.toString()
          };
        } catch (error) {
          console.log(`Error getting metadata for tokenId ${tokenId}: ${error.message}`);
        }
      }
      
      // Check if token is listed
      const isListed = await bridge.isListed?.(tokenId).catch(() => null);
      
      results.tokenChecks.push({
        tokenId,
        exists: !!owner,
        owner: owner || null,
        metadata,
        isListed: isListed !== null ? isListed : 'unknown'
      });
      
      console.log(`Token ID ${tokenId}: ${owner ? `Exists, owned by ${owner}` : "Does not exist"}`);
      if (metadata) {
        console.log(`  Inscription ID: ${metadata.inscriptionId}`);
        console.log(`  Inscription Number: ${metadata.inscriptionNumber}`);
      }
    } catch (error) {
      console.log(`Error checking tokenId ${tokenId}: ${error.message}`);
      results.tokenChecks.push({
        tokenId,
        exists: false,
        error: error.message
      });
    }
  }
  
  // Try to check some known inscription IDs
  // This is for illustration - ideally we would scan events to find processed inscriptions
  const inscriptionIdsToCheck = [
    // Add some inscription IDs you want to check
    // These would typically be gathered from event logs
  ];
  
  for (const inscriptionId of inscriptionIdsToCheck) {
    try {
      const isProcessed = await bridge.processedInscriptions(inscriptionId);
      results.processedInscriptions.push({
        inscriptionId,
        isProcessed
      });
    } catch (error) {
      console.log(`Error checking inscription ${inscriptionId}: ${error.message}`);
    }
  }
  
  // Check balance for a specific address
  const addressToCheck = "0x3ac65f3d2b5f8127daf66881e6801f2a23c69fde"; // Replace with your wallet address
  
  try {
    const balance = await bridge.balanceOf(addressToCheck);
    console.log(`Address ${addressToCheck} owns ${balance.toString()} NFTs`);
    
    results.addressBalance = {
      address: addressToCheck,
      balance: balance.toString()
    };
    
    // If the contract implements tokenOfOwnerByIndex, we can iterate through all owned tokens
    if (typeof bridge.tokenOfOwnerByIndex === 'function') {
      const ownedTokens = [];
      
      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await bridge.tokenOfOwnerByIndex(addressToCheck, i);
          const metadata = await bridge.ordinalMetadata(tokenId);
          
          ownedTokens.push({
            tokenId: tokenId.toString(),
            inscriptionId: metadata.inscriptionId,
            inscriptionNumber: metadata.inscriptionNumber.toString()
          });
          
          console.log(`Token #${i}: ID ${tokenId}, Inscription #${metadata.inscriptionNumber}`);
        } catch (error) {
          console.log(`Error fetching token at index ${i}: ${error.message}`);
        }
      }
      
      results.ownedTokens = ownedTokens;
    }
  } catch (error) {
    console.log(`Error checking balance for ${addressToCheck}: ${error.message}`);
  }
  
  // Save results to a file
  const outputPath = path.join(__dirname, 'nft-data-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${outputPath}`);
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 