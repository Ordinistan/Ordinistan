import { ethers } from "hardhat";

/**
 * This script adds NFT contract support to the OrdMarketPlace contract.
 * It enables the marketplace to handle transactions for the specified NFT contract.
 */
async function main() {
  console.log("Adding NFT contract support to OrdMarketPlace...");
  
  // Contract addresses from environment
  const marketplaceAddress = "0x5405b0E3851f99699c1E5C092F50BAfdAe770a0b";
  const bridgeAddress = "0xAA6005D95b61876E1B66191e9db39a66aceD3fa7";
  
  console.log(`Marketplace contract address: ${marketplaceAddress}`);
  console.log(`Bridge contract address to add: ${bridgeAddress}`);
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Get balance to ensure we have enough for gas
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);
  
  // Get the OrdMarketPlace contract
  const OrdMarketPlace = await ethers.getContractFactory("OrdMarketPlace");
  const marketplace = await OrdMarketPlace.attach(marketplaceAddress);
  
  console.log(`Connected to OrdMarketPlace contract at ${marketplaceAddress}`);
  
  // Check if the contract is already supported
  try {
    const isSupported = await marketplace.nftContracts(bridgeAddress);
    console.log(`Current support status for ${bridgeAddress}: ${isSupported ? "Supported" : "Not supported"}`);
    
    if (isSupported) {
      console.log("NFT contract is already supported. No action needed.");
      return;
    }
  } catch (error) {
    console.log(`Error checking support status: ${error.message}`);
  }
  
  // Add NFT contract support
  try {
    console.log(`Adding NFT contract support for ${bridgeAddress}...`);
    const tx = await marketplace.addNftContractSupport(bridgeAddress);
    console.log(`Transaction sent: ${tx.hash}`);
    
    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Verify the contract is now supported
    const isNowSupported = await marketplace.nftContracts(bridgeAddress);
    console.log(`Updated support status: ${isNowSupported ? "Successfully added support" : "Failed to add support"}`);
    
    if (isNowSupported) {
      console.log("✅ NFT contract support added successfully!");
    } else {
      console.log("❌ Failed to add NFT contract support!");
    }
  } catch (error) {
    console.error(`Error adding NFT contract support: ${error.message}`);
    
    // Check if we have permission to call this function
    try {
      const owner = await marketplace.owner();
      console.log(`Contract owner is: ${owner}`);
      console.log(`Your address is: ${deployer.address}`);
      
      if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("❌ You do not have permission to add NFT contract support. Only the contract owner can call this function.");
      }
    } catch (ownerError) {
      console.error(`Error checking contract owner: ${ownerError.message}`);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 