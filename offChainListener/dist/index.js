"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BridgeListener = void 0;
exports.checkBridgeService = checkBridgeService;
exports.startServer = startServer;
const axios_1 = __importDefault(require("axios"));
const cron = __importStar(require("node-cron"));
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const create_ordinal_htlc_1 = require("./htlc/create-ordinal-htlc");
const ordinalHtlcApi_1 = __importDefault(require("./htlc/ordinalHtlcApi"));
const refund_ordinal_htlc_1 = require("./htlc/refund-ordinal-htlc");
dotenv.config();
// Chain ID to name mapping
const CHAIN_NAMES = {
    11155111: 'sepolia',
    1116: 'core-mainnet'
};
// Validate environment variables
function validateEnvironment() {
    const required = {
        RPC_URL: process.env.RPC_URL,
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        BRIDGE_CONTRACT_ADDRESS: process.env.BRIDGE_CONTRACT_ADDRESS
    };
    const missing = Object.entries(required)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}\n` +
            'Please check your .env file and ensure all required variables are set.');
    }
    // Validate contract address format
    if (!ethers_1.ethers.isAddress(process.env.BRIDGE_CONTRACT_ADDRESS)) {
        throw new Error('BRIDGE_CONTRACT_ADDRESS is not a valid Ethereum address');
    }
}
class BridgeListener {
    constructor(storagePath) {
        this.bridgeRequests = [];
        this.BRIDGE_BTC_ADDRESS = 'bc1pmgv3st9cr2lk8mthty73lct3dkntec2p60s587keeaafm8la6u6qv9nrnk';
        this.CHAIN_NAME = '';
        this.isProcessing = false;
        // Validate environment variables first
        validateEnvironment();
        // Initialize API base URL
        this.HIRO_API_BASE = process.env.HIRO_API_BASE || 'https://api.hiro.so/ordinals/v1';
        // Initialize provider
        this.provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL);
        // Initialize wallet with error handling
        try {
            this.wallet = new ethers_1.ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            console.log("Signer address:", this.wallet.address);
        }
        catch (error) {
            throw new Error('Failed to initialize wallet. Please check your PRIVATE_KEY.');
        }
        // Initialize contract with error handling
        try {
            this.bridgeContract = new ethers_1.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, [
                'function mintBridgedOrdinal(address receiver, uint256 tokenId, string inscriptionId, uint256 inscriptionNumber, string contentType, uint256 contentLength, uint256 satOrdinal, string satRarity, uint256 genesisTimestamp) external returns (bool)',
                'function processedInscriptions(string) external view returns (bool)',
                'function ordinalMetadata(uint256) external view returns (tuple(string inscriptionId, uint256 inscriptionNumber, string contentType, uint256 contentLength, uint256 satOrdinal, string satRarity, uint256 genesisTimestamp, uint256 bridgeTimestamp))',
                'function bridgeService() external view returns (address)'
            ], this.wallet);
            // Verify contract connection and permissions
            this.verifyContractSetup();
        }
        catch (error) {
            throw new Error('Failed to initialize bridge contract. Please check your BRIDGE_CONTRACT_ADDRESS.');
        }
        // Set a temporary storage path - will be updated after chain info is initialized
        this.STORAGE_PATH = '';
    }
    async verifyContractSetup() {
        try {
            // Check wallet balance
            const balance = await this.provider.getBalance(this.wallet.address);
            console.log("Signer balance:", ethers_1.ethers.formatEther(balance), "ETH");
            // Check if wallet is bridge service
            const bridgeService = await this.bridgeContract.bridgeService();
            console.log("Bridge service address:", bridgeService);
            console.log("Signer is bridge service:", bridgeService.toLowerCase() === this.wallet.address.toLowerCase());
            if (bridgeService.toLowerCase() !== this.wallet.address.toLowerCase()) {
                throw new Error('Wallet is not set as bridge service. Please update bridge service address in the contract.');
            }
        }
        catch (error) {
            console.error("Contract setup verification failed:", error);
            throw error;
        }
    }
    static async create(storagePath) {
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
        }
        catch (error) {
            console.error('Failed to initialize BridgeListener:', error);
            throw error;
        }
    }
    async initializeChainInfo() {
        const network = await this.provider.getNetwork();
        const chainId = Number(network.chainId);
        this.CHAIN_NAME = CHAIN_NAMES[chainId] || `chain-${chainId}`;
    }
    getChainSpecificStoragePath(customPath) {
        const baseDir = customPath || path.join(__dirname, '../data');
        const chainDir = path.join(baseDir, this.CHAIN_NAME);
        // Create chain-specific directory if it doesn't exist
        if (!fs.existsSync(chainDir)) {
            fs.mkdirSync(chainDir, { recursive: true });
        }
        return path.join(chainDir, 'bridge-requests.json');
    }
    startMonitoring() {
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
    stopMonitoring() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('Bridge Listener stopped');
        }
    }
    loadRequests() {
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
            }
            else {
                console.log(`No existing requests found for ${this.CHAIN_NAME}`);
                // Initialize with empty array
                this.bridgeRequests = [];
                this.saveRequests();
            }
        }
        catch (error) {
            console.error(`Error loading bridge requests for ${this.CHAIN_NAME}:`, error);
            // Initialize with empty array on error
            this.bridgeRequests = [];
            this.saveRequests();
        }
    }
    saveRequests() {
        try {
            fs.writeFileSync(this.STORAGE_PATH, JSON.stringify(this.bridgeRequests, null, 2));
            console.log(`Saved ${this.bridgeRequests.length} requests to ${this.CHAIN_NAME} storage`);
        }
        catch (error) {
            console.error(`Error saving bridge requests for ${this.CHAIN_NAME}:`, error);
        }
    }
    getTokenIdFromInscription(inscriptionId) {
        // Remove the 'i' suffix if present
        const cleanId = inscriptionId.endsWith('i0') ? inscriptionId.slice(0, -2) : inscriptionId;
        // Convert hex to decimal
        const bigInt = BigInt('0x' + cleanId);
        // Use last 16 digits to ensure it fits in uint256
        const tokenId = bigInt % BigInt('10000000000000000');
        return tokenId.toString();
    }
    async createBridgeRequest(inscriptionId, userEvmAddress) {
        // Check if inscription has already been bridged
        const isProcessed = await this.bridgeContract.processedInscriptions(inscriptionId);
        if (isProcessed) {
            throw new Error('Inscription has already been bridged');
        }
        // Get inscription details to validate and store metadata
        const inscriptionDetails = await this.getInscriptionDetails(inscriptionId);
        const tokenId = this.getTokenIdFromInscription(inscriptionId);
        const request = {
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
    async checkPendingRequests() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        console.log('Checking pending bridge requests...');
        try {
            for (const request of this.bridgeRequests) {
                if (request.status === 'pending') {
                    try {
                        await this.processRequest(request);
                        // Save after each successful processing
                        this.saveRequests();
                    }
                    catch (error) {
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
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processRequest(request) {
        try {
            const inscription = await this.getInscriptionDetails(request.inscriptionId);
            // First check if it's at the main bridge address
            if (inscription.address === this.BRIDGE_BTC_ADDRESS) {
                console.log(`Ordinal ${request.inscriptionId} received at bridge address, minting NFT...`);
                await this.mintEvmNft(request);
                // Update request status
                request.status = 'completed';
                console.log(`Bridge request completed for inscription ${request.inscriptionId}`);
                return;
            }
            // Check if the API is enabled
            const ENABLE_HTLC_API = process.env.ENABLE_HTLC_API === 'true' || false;
            if (ENABLE_HTLC_API) {
                // Get HTLC requests from the storage path
                const htlcStoragePath = path.join(__dirname, '../data/htlc-requests.json');
                if (fs.existsSync(htlcStoragePath)) {
                    try {
                        const htlcData = fs.readFileSync(htlcStoragePath, 'utf8');
                        const htlcRequests = JSON.parse(htlcData);
                        // Check if the inscription is at any of the HTLC addresses
                        for (const htlcRequest of htlcRequests) {
                            if (htlcRequest.htlcAddress && inscription.address === htlcRequest.htlcAddress) {
                                console.log(`Ordinal ${request.inscriptionId} found at HTLC address ${htlcRequest.htlcAddress}, minting NFT...`);
                                // Update the EVM address from the HTLC request if available
                                if (htlcRequest.userEvmAddress) {
                                    request.userEvmAddress = htlcRequest.userEvmAddress;
                                }
                                await this.mintEvmNft(request);
                                // Update request status
                                request.status = 'completed';
                                console.log(`Bridge request completed for inscription ${request.inscriptionId}`);
                                return;
                            }
                        }
                    }
                    catch (error) {
                        console.error('Error reading HTLC requests file:', error);
                    }
                }
            }
            // If we get here, the ordinal is not at the bridge address or any HTLC address
            console.log(`Waiting for ordinal ${request.inscriptionId} to be transferred. Current owner: ${inscription.address}`);
        }
        catch (error) {
            console.error(`Error checking inscription ${request.inscriptionId}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                request.status = 'failed';
                console.log(`Bridge request marked as failed - inscription not found`);
            }
            throw error; // Re-throw to increment retry count
        }
    }
    async getInscriptionDetails(inscriptionId) {
        try {
            const response = await axios_1.default.get(`${this.HIRO_API_BASE}/inscriptions/${inscriptionId}`);
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    throw new Error(`Inscription ${inscriptionId} not found`);
                }
                throw new Error(`API Error: ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    async mintEvmNft(request) {
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
            const tx = await this.bridgeContract.mintBridgedOrdinal(request.userEvmAddress, tokenId, request.inscriptionId, inscription.number, inscription.content_type, inscription.content_length, BigInt(inscription.sat_ordinal), inscription.sat_rarity, inscription.genesis_timestamp, { gasLimit: 500000 });
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
        }
        catch (error) {
            console.error(`Error minting NFT for inscription ${request.inscriptionId}:`, error);
            console.error("Full error:", error);
            request.status = 'failed';
            request.lastChecked = Date.now();
            this.saveRequests();
            throw error; // Re-throw to increment retry count
        }
    }
    getBridgeRequests(status) {
        if (status) {
            return this.bridgeRequests.filter(r => r.status === status);
        }
        return this.bridgeRequests;
    }
    getAllBridgeRequests() {
        return this.bridgeRequests;
    }
    async retryFailedRequest(inscriptionId) {
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
    /**
     * Force mint an NFT for a specific inscription ID, bypassing the transfer check
     * @param inscriptionId The inscription ID to mint
     */
    async mintThroughInscriptionId(inscriptionId) {
        // Find the request with the given inscription ID
        const request = this.bridgeRequests.find(r => r.inscriptionId === inscriptionId);
        if (!request) {
            throw new Error(`No bridge request found for inscription ${inscriptionId}`);
        }
        console.log(`Forcing mint for inscription ${inscriptionId}, bypassing transfer check`);
        try {
            // Call the mintEvmNft method directly
            await this.mintEvmNft(request);
            // Update request status
            request.status = 'completed';
            this.saveRequests();
            console.log(`Successfully minted NFT for inscription ${inscriptionId}`);
        }
        catch (error) {
            console.error(`Error minting NFT for inscription ${inscriptionId}:`, error);
            throw error;
        }
    }
}
exports.BridgeListener = BridgeListener;
// Utility function to check bridge service
async function checkBridgeService() {
    const provider = new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL);
    const contract = new ethers_1.ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, ['function bridgeService() external view returns (address)'], provider);
    const bridgeService = await contract.bridgeService();
    console.log('Current bridge service address:', bridgeService);
}
// Express API setup
let bridgeListener = null;
async function initializeBridgeListener() {
    try {
        bridgeListener = await BridgeListener.create();
        console.log('Bridge Listener initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize bridge listener:', error);
        process.exit(1);
    }
}
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({
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
    }
    catch (error) {
        console.error('Error creating bridge request:', error);
        res.status(500).json({
            error: 'Failed to create bridge request',
            details: error.message
        });
    }
});
app.get('/api/mintThroughInscriptionId', async (req, res) => {
    try {
        if (!bridgeListener) {
            return res.status(503).json({ error: 'Bridge listener not initialized' });
        }
        const { inscriptionId } = req.query;
        if (!inscriptionId || typeof inscriptionId !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid inscriptionId parameter' });
        }
        await bridgeListener.mintThroughInscriptionId(inscriptionId);
        res.status(200).json({
            success: true,
            message: 'Minting through inscription ID successful'
        });
    }
    catch (error) {
        console.error('Error minting through inscription ID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mint through inscription ID',
            details: error.message
        });
    }
});
app.get('/api/htlc/create-ordinal-htlc', async (req, res) => {
    try {
        if (!bridgeListener) {
            return res.status(503).json({ error: 'Bridge listener not initialized' });
        }
        const { btcAddress, timeDuration } = req.body;
        try {
            const htlc = (0, create_ordinal_htlc_1.createOrdinalHtlc)(btcAddress, timeDuration);
            res.status(200).json(htlc);
        }
        catch (error) {
            console.error('Error creating ordinal HTLC:', error);
            res.status(500).json({
                error: 'Failed to create ordinal HTLC',
                details: error.message
            });
        }
    }
    catch (error) {
        console.error('Error creating ordinal HTLC:', error);
        res.status(500).json({
            error: 'Failed to create ordinal HTLC',
            details: error.message
        });
    }
});
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
        const refundTx = await (0, refund_ordinal_htlc_1.refundOrdinalHtlc)(btcAddress, htlcAddress);
        res.status(200).json({
            success: true,
            message: 'Refund transaction created successfully',
            refundTx
        });
    }
    catch (error) {
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
    }
    catch (error) {
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
    (0, ordinalHtlcApi_1.default)(app);
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
