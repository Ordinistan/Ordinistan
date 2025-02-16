import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-deploy";

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
        },
      },
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
    }
  }
};

export default config;
