import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
const robinhoodTestnetRpc = process.env.RH_RPC_URL || "https://rpc.testnet.chain.robinhood.com";
const robinhoodMainnetRpc = process.env.RH_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    robinhoodTestnet: {
      url: robinhoodTestnetRpc,
      chainId: 46630,
      accounts: privateKey ? [privateKey] : [],
    },
    robinhoodMainnet: {
      url: robinhoodMainnetRpc,
      chainId: 4663,
      accounts: privateKey ? [privateKey] : [],
    },
  },
  etherscan: {
    apiKey: {
      robinhoodTestnet: "empty",
    },
    customChains: [
      {
        network: "robinhoodTestnet",
        chainId: 46630,
        urls: {
          apiURL: "https://explorer.testnet.chain.robinhood.com/api/",
          browserURL: "https://explorer.testnet.chain.robinhood.com/",
        },
      },
      {
        network: "robinhoodMainnet",
        chainId: 4663,
        urls: {
          apiURL: "https://robinhoodchain.blockscout.com/api",
          browserURL: "https://robinhoodchain.blockscout.com/",
        },
      },
    ],
  },
};
