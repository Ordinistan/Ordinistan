import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { LightRelay } from "../../typechain-types/contracts/lightRelay/LightRelay";
import { ethers } from "hardhat";
import { loadJsonFile } from "./loadJsonFile";

export async function deployLightRelay(signer: SignerWithAddress): Promise<LightRelay> {
    const LightRelay = await ethers.getContractFactory("LightRelay");
    const lightRelay = await LightRelay.connect(signer).deploy();
    await lightRelay.waitForDeployment();

    // Load genesis headers from JSON file
    const headers = loadJsonFile("headersWithRetarget.json");
    const genesisBlock = headers.oldPeriodStart;
    const genesisHeader = genesisBlock.hex;
    const genesisHeight = genesisBlock.height;
    const proofLength = 4;

    // Initialize the relay with genesis data
    await lightRelay.connect(signer).genesis(genesisHeader, genesisHeight, proofLength);

    return lightRelay;
} 