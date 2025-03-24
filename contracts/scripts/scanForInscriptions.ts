import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * This script scans for all processed inscriptions by looking at past OrdinalBridged events
 * It helps identify all tokenIds that have been minted and their corresponding inscription IDs
 */
async function main() {
  console.log("Scanning for inscriptions from Bridge contract events...");
  
  // Get the deployed Bridge contract
  const bridgeAddress = "0x13748584Ea70ddd16273aF9a4797836d9eb7e7AA"; // From deployments/sepolia/Bridge.json
  
  // Get the contract factory
  const Bridge = await ethers.getContractFactory("Bridge");
  const bridge = await Bridge.attach(bridgeAddress);
  
  console.log(`Connected to Bridge contract at ${bridgeAddress}`);
  
  // Define the event signature for OrdinalBridged
  // Event: OrdinalBridged(string indexed inscriptionId, uint256 indexed tokenId, address indexed receiver, string contentType, uint256 satOrdinal)
  const ordinalBridgedFilter = bridge.filters.OrdinalBridged();
  
  // Get the current block number
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log(`Current block: ${currentBlock}`);
  
  // Define the block range to scan (adjust these values based on when your contract was deployed)
  // For testing, you can start with a smaller range
  const fromBlock = currentBlock - 100000; // Last ~2 weeks of blocks (adjust as needed)
  const toBlock = currentBlock;
  
  console.log(`Scanning events from block ${fromBlock} to ${toBlock}...`);
  
  const results = {
    contract: bridgeAddress,
    events: [],
    inscriptions: {},
    tokens: {}
  };
  
  try {
    // Fetch events in smaller chunks to avoid RPC timeout errors
    const CHUNK_SIZE = 10000;
    
    for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
      console.log(`Scanning blocks ${start} to ${end}...`);
      
      const events = await bridge.queryFilter(ordinalBridgedFilter, start, end);
      console.log(`Found ${events.length} OrdinalBridged events in this range`);
      
      for (const event of events) {
        // Extract event data
        const { blockNumber, transactionHash } = event;
        const args = event.args;
        
        if (!args) continue;
        
        const [inscriptionId, tokenId, receiver, contentType, satOrdinal] = args;
        
        // Format and save the event data
        const eventData = {
          blockNumber,
          transactionHash,
          inscriptionId,
          tokenId: tokenId.toString(),
          receiver,
          contentType,
          satOrdinal: satOrdinal.toString()
        };
        
        results.events.push(eventData);
        
        // Track inscriptions and tokens
        results.inscriptions[inscriptionId] = {
          tokenId: tokenId.toString(),
          receiver,
          contentType,
          satOrdinal: satOrdinal.toString()
        };
        
        results.tokens[tokenId.toString()] = {
          inscriptionId,
          receiver,
          contentType,
          satOrdinal: satOrdinal.toString()
        };
        
        console.log(`Found inscription ${inscriptionId} mapped to token ID ${tokenId.toString()}`);
      }
    }
    
    console.log(`\nScan complete. Found ${results.events.length} inscriptions.`);
    
    // For each token, try to get its metadata
    console.log("\nFetching metadata for each token...");
    
    for (const tokenId of Object.keys(results.tokens)) {
      try {
        const metadata = await bridge.ordinalMetadata(tokenId);
        
        results.tokens[tokenId].metadata = {
          inscriptionId: metadata.inscriptionId,
          inscriptionNumber: metadata.inscriptionNumber.toString(),
          contentType: metadata.contentType,
          contentLength: metadata.contentLength.toString(),
          satOrdinal: metadata.satOrdinal.toString(),
          satRarity: metadata.satRarity,
          genesisTimestamp: metadata.genesisTimestamp.toString(),
          bridgeTimestamp: metadata.bridgeTimestamp.toString()
        };
        
        console.log(`Fetched metadata for token ${tokenId} - Inscription #${metadata.inscriptionNumber}`);
      } catch (error) {
        console.log(`Error fetching metadata for token ${tokenId}: ${error.message}`);
      }
    }
    
    // Save results to a file
    const outputPath = path.join(__dirname, 'inscription-scan-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${outputPath}`);
    
    // Print summary
    console.log("\n===== SUMMARY =====");
    console.log(`Total inscriptions processed: ${Object.keys(results.inscriptions).length}`);
    console.log(`Total tokens minted: ${Object.keys(results.tokens).length}`);
    
    // Check for any tokens that have an inscriptionNumber matching 89992152
    const matchingTokens = Object.entries(results.tokens)
      .filter(([_, data]) => data.metadata && data.metadata.inscriptionNumber === "89992152");
    
    if (matchingTokens.length > 0) {
      console.log("\n🔍 Found tokens with inscription number 89992152 (shown on OpenSea):");
      matchingTokens.forEach(([tokenId, data]) => {
        console.log(`- Token ID: ${tokenId}`);
        console.log(`  Inscription ID: ${data.inscriptionId}`);
        console.log(`  Owner: ${data.receiver}`);
        console.log(`  Inscription Number: ${data.metadata.inscriptionNumber}`);
      });
    }
  } catch (error) {
    console.error(`Error scanning events: ${error.message}`);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 