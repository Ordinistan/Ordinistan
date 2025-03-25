import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-deploy";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Ensure private key exists
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";
const PRIVATE_KEY_CORE = process.env.PRIVATE_KEY_CORE || "0000000000000000000000000000000000000000000000000000000000000000";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.gateway.tenderly.co";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

interface ExtendedHardhatUserConfig extends HardhatUserConfig {
  namedAccounts?: {
    [name: string]: {
      default: number;
    };
  };
}

const config: ExtendedHardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true
        },
      },
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true
        },
      }
    ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    seller: {
      default: 1,
    },
    buyer: {
      default: 2,
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      chainId: 31337
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    core: {
      url: "https://rpc.coredao.org",
      accounts: [PRIVATE_KEY_CORE],
      chainId: 1116,
    },
  },
};

export default config;
