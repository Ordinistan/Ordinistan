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
}

const PLATFORM_FEE = 250; // 2.5%

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
    network: string
): Promise<any> {
    const existing = await checkExistingDeployment(name, network);
    
    if (existing) {
        console.log(`\nExisting ${name} deployment found at: ${existing.address}`);
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
    network: string
) {
    try {
        // Create deployments directory in project root
        const rootDir = process.cwd(); // Get the project root directory
        console.log("Project root directory:", rootDir);
        
        const deploymentsDir = path.join(rootDir, 'deployments');
        const networkDir = path.join(deploymentsDir, network);
        
        console.log("Creating directories if they don't exist:");
        console.log("Deployments dir:", deploymentsDir);
        console.log("Network dir:", networkDir);
        
        // Create directories if they don't exist
        if (!fs.existsSync(deploymentsDir)) {
            console.log("Creating deployments directory...");
            fs.mkdirSync(deploymentsDir);
        }
        
        if (!fs.existsSync(networkDir)) {
            console.log("Creating network directory...");
            fs.mkdirSync(networkDir);
        }

        const deploymentInfo: DeploymentInfo = {
            address,
            abi,
            network,
            timestamp: Date.now()
        };

        const filePath = path.join(networkDir, `${name}.json`);
        console.log(`Writing deployment info to: ${filePath}`);
        
        fs.writeFileSync(
            filePath,
            JSON.stringify(deploymentInfo, null, 2)
        );

        console.log(`\n${name} deployed to: ${address}`);
        console.log(`Deployment info saved to: ${filePath}`);
    } catch (error) {
        console.error("Error saving deployment:", error);
        throw error;
    }
}

async function main() {
    console.log("Starting deployment process...");
    
    const [deployer] = await ethers.getSigners();
    const network = process.env.HARDHAT_NETWORK || 'hardhat';

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Network:", network);

    try {
        // Deploy ERC721Factory
        const erc721Factory = await handleDeployment(
            'ERC721Factory',
            async () => {
                const Factory = await ethers.getContractFactory("ERC721Factory");
                const contract = await Factory.deploy();
                await contract.waitForDeployment();
                await saveDeployment(
                    'ERC721Factory',
                    await contract.getAddress(),
                    JSON.parse(Factory.interface.formatJson()),
                    network
                );
                return contract;
            },
            network
        );

        // Deploy ERC1155Factory
        const erc1155Factory = await handleDeployment(
            'ERC1155Factory',
            async () => {
                const Factory = await ethers.getContractFactory("ERC1155Factory");
                const contract = await Factory.deploy();
                await contract.waitForDeployment();
                await saveDeployment(
                    'ERC1155Factory',
                    await contract.getAddress(),
                    JSON.parse(Factory.interface.formatJson()),
                    network
                );
                return contract;
            },
            network
        );

        // Deploy Marketplace
        const marketplace = await handleDeployment(
            'OrdMarketPlace',
            async () => {
                const Marketplace = await ethers.getContractFactory("OrdMarketPlace");
                const contract = await upgrades.deployProxy(Marketplace, [PLATFORM_FEE], {
                    kind: 'uups',
                    initializer: 'initialize'
                });
                await contract.waitForDeployment();
                await saveDeployment(
                    'OrdMarketPlace',
                    await contract.getAddress(),
                    JSON.parse(Marketplace.interface.formatJson()),
                    network
                );
                return contract;
            },
            network
        );

        console.log("\nAll contracts deployed/loaded successfully!");
        
        // Log all deployment addresses together
        console.log("\nDeployment Summary:");
        console.log("--------------------");
        console.log("ERC721Factory:", await erc721Factory.getAddress());
        console.log("ERC1155Factory:", await erc1155Factory.getAddress());
        console.log("Marketplace:", await marketplace.getAddress());
        
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