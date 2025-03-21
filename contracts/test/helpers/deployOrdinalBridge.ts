import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { OrdinalBridge } from "../../typechain-types/contracts/OrdinalBridge";
import { ethers } from "hardhat";

export async function deployOrdinalBridge(
    signer: SignerWithAddress,
    name: string,
    symbol: string,
    lightRelayAddress: string
): Promise<OrdinalBridge> {
    const OrdinalBridge = await ethers.getContractFactory("OrdinalBridge");
    const ordinalBridge = await OrdinalBridge.connect(signer).deploy(
        name,
        symbol,
        lightRelayAddress
    );
    await ordinalBridge.waitForDeployment();
    return ordinalBridge;
} 