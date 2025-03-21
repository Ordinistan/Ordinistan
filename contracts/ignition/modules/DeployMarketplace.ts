import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface DeploymentInfo {
    address: string;
    abi: any;
    network: string;
    timestamp: number;
    deployerAddress: string;
    platformFee: number;
}

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promise-based question function
function askQuestion(query: string): Promise<string> {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function checkExistingDeployment(name: string, network: string): Promise<DeploymentInfo | null> {
    const filePath = path.join(process.cwd(), 'deployments', network, `${name}.json`);
    
    if (fs.existsSync(filePath)) {
        const deploymentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return deploymentData;
    }
    return null;
}

async function handleDeployment(
    name: string,
    deployFn: () => Promise<any>,
    network: string,
    deployerAddress: string,
    platformFee: number
): Promise<any> {
    const existing = await checkExistingDeployment(name, network);
    
    if (existing) {
        console.log(`\nExisting ${name} deployment found at: ${existing.address}`);
        console.log(`Deployer Address: ${existing.deployerAddress}`);
        console.log(`Platform Fee: ${existing.platformFee / 100}%`);
        console.log(`Deployed on: ${new Date(existing.timestamp).toLocaleString()}`);
        
        const answer = await askQuestion(
            `Do you want to use the existing deployment? (y/n): `
        );

        if (answer.toLowerCase() === 'y') {
            console.log(`Using existing ${name} deployment...`);
            return {
                getAddress: async () => existing.address,
                interface: new ethers.Interface(existing.abi)
            };
        }
    }

    console.log(`\nDeploying new ${name}...`);
    return deployFn();
}

async function saveDeployment(
    name: string,
    address: string,
    abi: any,
    network: string,
    deployerAddress: string,
    platformFee: number
) {
    try {
        const rootDir = process.cwd();
        const deploymentsDir = path.join(rootDir, 'deployments');
        const networkDir = path.join(deploymentsDir, network);
        
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir);
        }
        
        if (!fs.existsSync(networkDir)) {
            fs.mkdirSync(networkDir);
        }

        const deploymentInfo: DeploymentInfo = {
            address,
            abi,
            network,
            timestamp: Date.now(),
            deployerAddress,
            platformFee
        };

        const filePath = path.join(networkDir, `${name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

        // Also save the address to a .env file for the frontend
        const envPath = path.join(rootDir, '..', 'ordinistan-fe', '.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            // Update or add MARKETPLACE_CONTRACT_ADDRESS
            if (envContent.includes('NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=')) {
                envContent = envContent.replace(
                    /NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=.*/,
                    `NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${address}`
                );
            } else {
                envContent += `\n# Marketplace Contract\nNEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${address}\n`;
            }
            fs.writeFileSync(envPath, envContent);
            console.log(`Updated Marketplace contract address in ordinistan-fe/.env`);
        }

        console.log(`\n${name} deployed to: ${address}`);
        console.log(`Deployment info saved to: ${filePath}`);
    } catch (error) {
        console.error("Error saving deployment:", error);
        throw error;
    }
}

async function main() {
    console.log("Starting Marketplace deployment process...");
    
    const [deployer] = await ethers.getSigners();
    const network = process.env.HARDHAT_NETWORK || 'hardhat';

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Network:", network);

    // Default platform fee is 2.5% (250 basis points)
    const defaultPlatformFee = 250;
    
    // Ask for platform fee
    const platformFeeInput = await askQuestion(
        `Enter platform fee in basis points (100 = 1%, default ${defaultPlatformFee} = 2.5%): `
    );
    
    const platformFee = platformFeeInput ? parseInt(platformFeeInput) : defaultPlatformFee;
    
    if (isNaN(platformFee) || platformFee > 50000) { // Max 500%
        console.error("Invalid platform fee. Must be a number between 0 and 50000");
        process.exit(1);
    }

    try {
        // Deploy Marketplace contract
        const marketplace = await handleDeployment(
            'OrdMarketPlace',
            async () => {
                const Marketplace = await ethers.getContractFactory("OrdMarketPlace");
                const contract = await upgrades.deployProxy(
                    Marketplace,
                    [platformFee],
                    {
                        kind: 'uups',
                        initializer: 'initialize'
                    }
                );
                await contract.waitForDeployment();
                
                await saveDeployment(
                    'OrdMarketPlace',
                    await contract.getAddress(),
                    JSON.parse(Marketplace.interface.formatJson()),
                    network,
                    deployer.address,
                    platformFee
                );
                return contract;
            },
            network,
            deployer.address,
            platformFee
        );

        console.log("\nMarketplace contract deployed successfully!");
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("Marketplace Contract:", await marketplace.getAddress());
        console.log("Owner (deployer):", deployer.address);
        console.log("Platform Fee:", `${platformFee / 100}%`);
        
        // Additional setup instructions
        console.log("\nNext steps:");
        console.log("1. The deployer address is automatically set as the contract owner");
        console.log("2. Update the MARKETPLACE_CONTRACT_ADDRESS in your frontend .env file");
        console.log("3. Add NFT contract support using addNftContractSupport()");
        console.log("4. Add payment token support using addTokenSupport()");
        
    } catch (error) {
        console.error("Error during deployment:", error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    }); 