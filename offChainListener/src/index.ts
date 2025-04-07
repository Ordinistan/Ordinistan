import axios from 'axios';
import * as cron from 'node-cron';
import { ethers, Contract, ContractTransactionResponse, BaseContract } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import cors from 'cors';
import { createOrdinalHtlc } from './htlc/create-ordinal-htlc';
import setupOrdinalHtlcApi from './htlc/ordinalHtlcApi';
import { refundOrdinalHtlc } from './htlc/refund-ordinal-htlc';

dotenv.config();

// Chain ID to name mapping
const CHAIN_NAMES: { [key: number]: string } = {
  11155111: 'sepolia',
  1116: 'core-mainnet'
};

// Validate environment variables
function validateEnvironment(): void {
  const required = {
    RPC_URL: process.env.RPC_URL,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    BRIDGE_CONTRACT_ADDRESS: process.env.BRIDGE_CONTRACT_ADDRESS
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Validate contract address format
  if (!ethers.isAddress(process.env.BRIDGE_CONTRACT_ADDRESS!)) {
    throw new Error('BRIDGE_CONTRACT_ADDRESS is not a valid Ethereum address');
  }
}

// Types
interface BridgeRequest {
  inscriptionId: string;
  userEvmAddress: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  tokenId?: string; // TokenId for the NFT
  lastChecked?: number; // Track when we last checked this request
  retryCount?: number; // Track number of retries for failed requests
  metadata?: {
    contentType: string;
    contentUrl: string;
    previewUrl: string;
    name: string;
    description: string;
  };
}

interface InscriptionResponse {
  id: string;
  number: number;
  address: string; // Current owner's address
  genesis_address: string;
  genesis_block_height: number;
  genesis_block_hash: string;
  genesis_tx_id: string;
  genesis_timestamp: number;
  genesis_fee: number;
  output_value: number;
  sat_ordinal: number;
  sat_rarity: string;
  mime_type: string;
  content_type: string;
  content_length: number;
  timestamp: number;
}

interface BridgeContractInterface {
  mintBridgedOrdinal(
    receiver: string,
    tokenId: string,
    inscriptionId: string,
    inscriptionNumber: number,
    contentType: string,
    contentLength: number,
    satOrdinal: bigint,
    satRarity: string,
    genesisTimestamp: number,
    options?: { gasLimit: number }
  ): Promise<ContractTransactionResponse>;
  processedInscriptions(inscriptionId: string): Promise<boolean>;
  ordinalMetadata(tokenId: string): Promise<any>;
  bridgeService(): Promise<string>;
}

type BridgeContract = BaseContract & BridgeContractInterface;

class BridgeListener {
  private bridgeRequests: BridgeRequest[] = [];
  private readonly HIRO_API_BASE: string;
  private readonly BRIDGE_BTC_ADDRESS = 'bc1pmgv3st9cr2lk8mthty73lct3dkntec2p60s587keeaafm8la6u6qv9nrnk';
  private STORAGE_PATH: string;
  private CHAIN_NAME: string = '';
  private cronJob?: cron.ScheduledTask;
  private isProcessing: boolean = false;
  
  // Contract interaction properties
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private bridgeContract: BridgeContract;

  private constructor(storagePath?: string) {
    // Validate environment variables first
    validateEnvironment();

    // Initialize API base URL
    this.HIRO_API_BASE = process.env.HIRO_API_BASE || 'https://api.hiro.so/ordinals/v1';
    
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Initialize wallet with error handling
    try {
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
      console.log("Signer address:", this.wallet.address);
    } catch (error) {
      throw new Error('Failed to initialize wallet. Please check your PRIVATE_KEY.');
    }

    // Initialize contract with error handling
    try {
      this.bridgeContract = new Contract(
        process.env.BRIDGE_CONTRACT_ADDRESS!,
        [
          'function mintBridgedOrdinal(address receiver, uint256 tokenId, string inscriptionId, uint256 inscriptionNumber, string contentType, uint256 contentLength, uint256 satOrdinal, string satRarity, uint256 genesisTimestamp) external returns (bool)',
          'function processedInscriptions(string) external view returns (bool)',
          'function ordinalMetadata(uint256) external view returns (tuple(string inscriptionId, uint256 inscriptionNumber, string contentType, uint256 contentLength, uint256 satOrdinal, string satRarity, uint256 genesisTimestamp, uint256 bridgeTimestamp))',
          'function bridgeService() external view returns (address)'
        ],
        this.wallet
      ) as unknown as BridgeContract;

      // Verify contract connection and permissions
      this.verifyContractSetup();
    } catch (error) {
      throw new Error('Failed to initialize bridge contract. Please check your BRIDGE_CONTRACT_ADDRESS.');
    }

    // Set a temporary storage path - will be updated after chain info is initialized
    this.STORAGE_PATH = '';
  }

  private async verifyContractSetup(): Promise<void> {
    try {
      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log("Signer balance:", ethers.formatEther(balance), "ETH");

      // Check if wallet is bridge service
      const bridgeService = await this.bridgeContract.bridgeService();
      console.log("Bridge service address:", bridgeService);
      console.log("Signer is bridge service:", bridgeService.toLowerCase() === this.wallet.address.toLowerCase());

      if (bridgeService.toLowerCase() !== this.wallet.address.toLowerCase()) {
        throw new Error('Wallet is not set as bridge service. Please update bridge service address in the contract.');
      }
    } catch (error) {
      console.error("Contract setup verification failed:", error);
      throw error;
    }
  }

  public static async create(storagePath?: string): Promise<BridgeListener> {
    const instance = new BridgeListener(storagePath);
    
    try {
      // Initialize chain information first
      await instance.initializeChainInfo();
      console.log(`Connected to chain: ${instance.CHAIN_NAME}`);

      // Now initialize storage path with the correct chain name
      instance['STORAGE_PATH'] = instance.getChainSpecificStoragePath(storagePath);
      
      // Load existing requests
      instance.loadRequests();
      
      // Start monitoring
      instance.startMonitoring();
      
      console.log('BridgeListener initialized successfully');
      console.log(`Contract Address: ${process.env.BRIDGE_CONTRACT_ADDRESS}`);
      console.log(`RPC URL: ${process.env.RPC_URL}`);
      console.log(`Storage Path: ${instance['STORAGE_PATH']}`);

      return instance;
    } catch (error) {
      console.error('Failed to initialize BridgeListener:', error);
      throw error;
    }
  }

  private async initializeChainInfo(): Promise<void> {
    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);
    this.CHAIN_NAME = CHAIN_NAMES[chainId] || `chain-${chainId}`;
  }

  private getChainSpecificStoragePath(customPath?: string): string {
    const baseDir = customPath || path.join(__dirname, '../data');
    const chainDir = path.join(baseDir, this.CHAIN_NAME);
    
    // Create chain-specific directory if it doesn't exist
    if (!fs.existsSync(chainDir)) {
      fs.mkdirSync(chainDir, { recursive: true });
    }
    
    return path.join(chainDir, 'bridge-requests.json');
  }

  private startMonitoring(): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.cronJob = cron.schedule('*/1 * * * *', async () => {
      if (!this.isProcessing) {
        await this.checkPendingRequests();
      }
    });

    console.log(`Bridge Listener started. Monitoring transfers to ${this.BRIDGE_BTC_ADDRESS}`);
  }

  public stopMonitoring(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Bridge Listener stopped');
    }
  }

  private loadRequests(): void {
    try {
      if (fs.existsSync(this.STORAGE_PATH)) {
        const data = fs.readFileSync(this.STORAGE_PATH, 'utf8');
        // Handle empty file case
        if (!data.trim()) {
          this.bridgeRequests = [];
          // Initialize empty file with empty array
          this.saveRequests();
          console.log(`Initialized empty request file for ${this.CHAIN_NAME}`);
          return;
        }
        
        this.bridgeRequests = JSON.parse(data);
        console.log(`Loaded ${this.bridgeRequests.length} bridge requests from ${this.CHAIN_NAME} storage`);
      } else {
        console.log(`No existing requests found for ${this.CHAIN_NAME}`);
        // Initialize with empty array
        this.bridgeRequests = [];
        this.saveRequests();
      }
    } catch (error) {
      console.error(`Error loading bridge requests for ${this.CHAIN_NAME}:`, error);
      // Initialize with empty array on error
      this.bridgeRequests = [];
      this.saveRequests();
    }
  }

  private saveRequests(): void {
    try {
      fs.writeFileSync(this.STORAGE_PATH, JSON.stringify(this.bridgeRequests, null, 2));
      console.log(`Saved ${this.bridgeRequests.length} requests to ${this.CHAIN_NAME} storage`);
    } catch (error) {
      console.error(`Error saving bridge requests for ${this.CHAIN_NAME}:`, error);
    }
  }

  private getTokenIdFromInscription(inscriptionId: string): string {
    // Remove the 'i' suffix if present
    const cleanId = inscriptionId.endsWith('i0') ? inscriptionId.slice(0, -2) : inscriptionId;
    
    // Convert hex to decimal
    const bigInt = BigInt('0x' + cleanId);
    // Use last 16 digits to ensure it fits in uint256
    const tokenId = bigInt % BigInt('10000000000000000');
    
    return tokenId.toString();
  }

  public async createBridgeRequest(
    inscriptionId: string,
    userEvmAddress: string,
  ): Promise<void> {
    // Check if inscription has already been bridged
    const isProcessed = await this.bridgeContract.processedInscriptions(inscriptionId);
    if (isProcessed) {
      throw new Error('Inscription has already been bridged');
    }

    // Get inscription details to validate and store metadata
    const inscriptionDetails = await this.getInscriptionDetails(inscriptionId);
    
    const tokenId = this.getTokenIdFromInscription(inscriptionId);

    const request: BridgeRequest = {
      inscriptionId,
      userEvmAddress,
      status: 'pending',
      timestamp: Date.now(),
      tokenId,
      lastChecked: 0,
      retryCount: 0,
      metadata: {
        contentType: inscriptionDetails.content_type,
        contentUrl: `${this.HIRO_API_BASE}/inscriptions/${inscriptionId}/content`,
        previewUrl: `${this.HIRO_API_BASE}/inscriptions/${inscriptionId}/preview`,
        name: `Ordinistan #${inscriptionDetails.number}`,
        description: `Bridged Bitcoin Ordinal Inscription #${inscriptionDetails.number}`
      }
    };

    this.bridgeRequests.push(request);

    // Save the updated requests
    this.saveRequests();

    console.log(`New bridge request created for inscription ${inscriptionId}`);
    console.log(`Please transfer the ordinal to ${this.BRIDGE_BTC_ADDRESS}`);
  }

  private async checkPendingRequests(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Checking pending bridge requests...');

    try {
      for (const request of this.bridgeRequests) {
        if (request.status === 'pending') {
          try {
            await this.processRequest(request);
            // Save after each successful processing
            this.saveRequests();
          } catch (error) {
            console.error(`Error processing request ${request.inscriptionId}:`, error);
            
            // Update retry count and potentially mark as failed
            request.retryCount = (request.retryCount || 0) + 1;
            if (request.retryCount >= 5) { // Mark as failed after 5 retries
              request.status = 'failed';
              this.saveRequests();
            }
          }
        }
        request.lastChecked = Date.now();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processRequest(request: BridgeRequest): Promise<void> {
    try {
      const inscription = await this.getInscriptionDetails(request.inscriptionId);

      if (inscription.address === this.BRIDGE_BTC_ADDRESS) {
        console.log(`Ordinal ${request.inscriptionId} received at bridge address, minting NFT...`);
        
        await this.mintEvmNft(request);
        
        // Update request status
        request.status = 'completed';
        console.log(`Bridge request completed for inscription ${request.inscriptionId}`);
      } else {
        console.log(`Waiting for ordinal ${request.inscriptionId} to be transferred. Current owner: ${inscription.address}`);
      }
    } catch (error) {
      console.error(`Error checking inscription ${request.inscriptionId}:`, error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        request.status = 'failed';
        console.log(`Bridge request marked as failed - inscription not found`);
      }
      throw error; // Re-throw to increment retry count
    }
  }

  private async getInscriptionDetails(inscriptionId: string): Promise<InscriptionResponse> {
    try {
      const response = await axios.get<InscriptionResponse>(
        `${this.HIRO_API_BASE}/inscriptions/${inscriptionId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Inscription ${inscriptionId} not found`);
        }
        throw new Error(`API Error: ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  private async mintEvmNft(request: BridgeRequest): Promise<void> {
    try {
      const tokenId = this.getTokenIdFromInscription(request.inscriptionId);
      const metadata = request.metadata;
      
      if (!metadata) {
        throw new Error('No metadata found for inscription');
      }

      // Get inscription details for additional metadata
      const inscription = await this.getInscriptionDetails(request.inscriptionId);

      // Mint with gas limit to handle metadata storage
      console.log("Sending mint transaction...");
      const tx = await this.bridgeContract.mintBridgedOrdinal(
        request.userEvmAddress,
        tokenId,
        request.inscriptionId,
        inscription.number,
        inscription.content_type,
        inscription.content_length,
        BigInt(inscription.sat_ordinal),
        inscription.sat_rarity,
        inscription.genesis_timestamp,
        { gasLimit: 500000 }
      );

      console.log("Transaction sent:", tx.hash);
      console.log(`Minting NFT for inscription ${request.inscriptionId}...`);
      const receipt = await tx.wait();
      
      if (!receipt || !receipt.status) {
        throw new Error('Transaction failed');
      }
      
      request.tokenId = tokenId;
      request.status = 'completed';
      request.lastChecked = Date.now();
      this.saveRequests();
      
      console.log(`Successfully minted NFT for inscription ${request.inscriptionId}`);
    } catch (error) {
      console.error(`Error minting NFT for inscription ${request.inscriptionId}:`, error);
      console.error("Full error:", error);
      request.status = 'failed';
      request.lastChecked = Date.now();
      this.saveRequests();
      throw error; // Re-throw to increment retry count
    }
  }

  public getBridgeRequests(status?: 'pending' | 'completed' | 'failed'): BridgeRequest[] {
    if (status) {
      return this.bridgeRequests.filter(r => r.status === status);
    }
    return this.bridgeRequests;
  }

  public getAllBridgeRequests(): BridgeRequest[] {
    return this.bridgeRequests;
  }

  public async retryFailedRequest(inscriptionId: string): Promise<void> {
    const request = this.bridgeRequests.find(r => r.inscriptionId === inscriptionId);
    if (!request) {
      throw new Error('Bridge request not found');
    }
    if (request.status !== 'failed') {
      throw new Error('Only failed requests can be retried');
    }

    request.status = 'pending';
    request.retryCount = 0;
    request.lastChecked = 0;
    this.saveRequests();
    
    console.log(`Retrying bridge request for inscription ${inscriptionId}`);
    await this.checkPendingRequests();
  }
}

// Utility function to check bridge service
async function checkBridgeService() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const contract = new ethers.Contract(
    process.env.BRIDGE_CONTRACT_ADDRESS!,
    ['function bridgeService() external view returns (address)'],
    provider
  );

  const bridgeService = await contract.bridgeService();
  console.log('Current bridge service address:', bridgeService);
}

// Express API setup
let bridgeListener: BridgeListener | null = null;

async function initializeBridgeListener() {
  try {
    bridgeListener = await BridgeListener.create();
    console.log('Bridge Listener initialized successfully');
  } catch (error) {
    console.error('Failed to initialize bridge listener:', error);
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

// API Routes
app.post('/api/bridge-request', async (req, res) => {
  try {
    if (!bridgeListener) {
      return res.status(503).json({ error: 'Bridge listener not initialized' });
    }

    const { inscriptionId, userEvmAddress } = req.body;

    if (!inscriptionId || !userEvmAddress) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    await bridgeListener.createBridgeRequest(inscriptionId, userEvmAddress);
    
    res.status(200).json({ 
      message: 'Bridge request created successfully',
      bridgeAddress: bridgeListener['BRIDGE_BTC_ADDRESS']
    });
  } catch (error: any) {
    console.error('Error creating bridge request:', error);
    res.status(500).json({ 
      error: 'Failed to create bridge request',
      details: error.message 
    });
  }
});

app.get('/api/htlc/create-ordinal-htlc', async (req, res) => {
  try {
    if (!bridgeListener) {
      return res.status(503).json({ error: 'Bridge listener not initialized' });
    }
    
    const {btcAddress, timeDuration} = req.body;

    try {
      const htlc = createOrdinalHtlc(btcAddress, timeDuration);
      res.status(200).json(htlc);
    } catch (error: any) {
      console.error('Error creating ordinal HTLC:', error);
      res.status(500).json({ 
        error: 'Failed to create ordinal HTLC',
        details: error.message 
      });
    }
  } catch (error: any) {
    console.error('Error creating ordinal HTLC:', error);
    res.status(500).json({ 
      error: 'Failed to create ordinal HTLC',
      details: error.message 
    });
  }
})

app.post('/api/htlc/refund-ordinal-htlc', async (req, res) => {
  try {
    const { btcAddress, htlcAddress } = req.body;
    
    if (!btcAddress || !htlcAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: 'btcAddress and htlcAddress are required'
      });
    }
    
    const refundTx = await refundOrdinalHtlc(btcAddress, htlcAddress);
    
    res.status(200).json({
      success: true,
      message: 'Refund transaction created successfully',
      refundTx
    });
  } catch (error: any) {
    console.error('Error refunding ordinal HTLC:', error);

    // Check if it's a timelock error
    if (error.message.includes('Timelock has not expired yet')) {
      return res.status(400).json({
        success: false,
        error: 'Timelock not expired',
        details: error.message
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to refund ordinal HTLC',
      details: error.message 
    });
  }
});

// app.get('/api/htlc/refund-ordinal-htlc-mnemonic', async (req, res) => {
//   try {
//     const wif = mnemonicToWIF();
//     res.status(200).json({ wif });
//   } catch (error: any) {
//     console.error('Error generating WIF from mnemonic:', error);
//     res.status(500).json({ 
//       error: 'Failed to generate WIF from mnemonic',
//       details: error.message 
//     });
//   }
// })

app.get('/api/bridge-request/:inscriptionId', async (req, res) => {
  try {
    if (!bridgeListener) {
      return res.status(503).json({ error: 'Bridge listener not initialized' });
    }

    const { inscriptionId } = req.params;
    const requests = bridgeListener.getBridgeRequests();
    const request = requests.find(r => r.inscriptionId === inscriptionId);

    if (!request) {
      return res.status(404).json({ error: 'Bridge request not found' });
    }

    res.status(200).json(request);
  } catch (error: any) {
    console.error('Error fetching bridge request:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bridge request',
      details: error.message 
    });
  }
});

// Check if HTLC API is enabled
const ENABLE_HTLC_API = process.env.ENABLE_HTLC_API === 'true' || false;

// Setup HTLC API if enabled
if (ENABLE_HTLC_API) {
  console.log('Setting up Ordinal HTLC API');
  setupOrdinalHtlcApi(app);
}

// Start server
async function startServer() {
  await initializeBridgeListener();
  
  app.listen(port, () => {
    console.log(`Bridge Listener API running on port ${port}`);
    console.log(`HTLC API ${ENABLE_HTLC_API ? 'enabled' : 'disabled'}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    if (bridgeListener) {
      bridgeListener.stopMonitoring();
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    if (bridgeListener) {
      bridgeListener.stopMonitoring();
    }
    process.exit(0);
  });
}

// Export the main components
export { BridgeListener, checkBridgeService, startServer };

// Start the server if this is the main module
if (require.main === module) {
  startServer().catch(console.error);
}

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
}); 