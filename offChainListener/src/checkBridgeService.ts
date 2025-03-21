import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const contract = new ethers.Contract(
    process.env.BRIDGE_CONTRACT_ADDRESS!,
    ['function bridgeService() external view returns (address)'],
    provider
  );

  const bridgeService = await contract.bridgeService();
  console.log('Current bridge service address:', bridgeService);
}

main().catch(console.error); 