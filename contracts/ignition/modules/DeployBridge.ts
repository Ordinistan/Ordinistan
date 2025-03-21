import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface DeploymentInfo {
    address: string;
    abi: any;
    network: string;
    timestamp: number;
    deployerAddress: string;
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
    deployerAddress: string
): Promise<any> {
    const existing = await checkExistingDeployment(name, network);
    
    if (existing) {
        console.log(`\nExisting ${name} deployment found at: ${existing.address}`);
        console.log(`Deployer/Bridge Service Address: ${existing.deployerAddress}`);
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
    deployerAddress: string
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
            deployerAddress
        };

        const filePath = path.join(networkDir, `${name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

        // Also save the address to a .env file for the offChainListener
        const envPath = path.join(rootDir, '..', 'offChainListener', '.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            // Update or add BRIDGE_CONTRACT_ADDRESS
            if (envContent.includes('BRIDGE_CONTRACT_ADDRESS=')) {
                envContent = envContent.replace(
                    /BRIDGE_CONTRACT_ADDRESS=.*/,
                    `BRIDGE_CONTRACT_ADDRESS=${address}`
                );
            } else {
                envContent += `\n# Bridge Contract\nBRIDGE_CONTRACT_ADDRESS=${address}\n`;
            }
            fs.writeFileSync(envPath, envContent);
            console.log(`Updated Bridge contract address in offChainListener/.env`);
        }

        console.log(`\n${name} deployed to: ${address}`);
        console.log(`Deployment info saved to: ${filePath}`);
    } catch (error) {
        console.error("Error saving deployment:", error);
        throw error;
    }
}

async function main() {
    console.log("Starting Bridge deployment process...");
    
    const [deployer] = await ethers.getSigners();
    const network = process.env.HARDHAT_NETWORK || 'hardhat';

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("This address will be the bridge service address");
    console.log("Network:", network);

    try {
        // Deploy Bridge contract
        const bridge = await handleDeployment(
            'Bridge',
            async () => {
                const Bridge = await ethers.getContractFactory("Bridge");
                const contract = await Bridge.deploy(
                    "Bridged Ordinals", // name
                    "BORD"              // symbol
                );
                await contract.waitForDeployment();
                
                await saveDeployment(
                    'Bridge',
                    await contract.getAddress(),
                    JSON.parse(Bridge.interface.formatJson()),
                    network,
                    deployer.address
                );
                return contract;
            },
            network,
            deployer.address
        );

        console.log("\nBridge contract deployed successfully!");
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("Bridge Contract:", await bridge.getAddress());
        console.log("Bridge Service (deployer):", deployer.address);
        
        // Additional setup instructions
        console.log("\nNext steps:");
        console.log("1. The deployer address is automatically set as the bridge service");
        console.log("2. Update the BRIDGE_CONTRACT_ADDRESS in your offChainListener/.env file");
        console.log("3. Ensure the bridge service account has sufficient funds for gas");
        console.log("4. Start the bridge listener service");
        
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