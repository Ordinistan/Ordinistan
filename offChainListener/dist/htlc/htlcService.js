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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtlcService = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const ecpair_1 = require("ecpair");
const ecc = __importStar(require("tiny-secp256k1"));
const crypto = __importStar(require("crypto"));
dotenv.config();
// Initialize ECPair for signing
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
/**
 * HTLC Service for managing Hash Time-Locked Contracts for ordinals
 */
class HtlcService {
    constructor(customStoragePath) {
        // Set storage path
        const dataDir = path.join(__dirname, '../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        this.storagePath = customStoragePath || path.join(dataDir, 'htlc-requests.json');
        this.htlcRequests = new Map();
        // Load existing requests from storage
        this.loadRequests();
    }
    /**
     * Generate a unique request ID
     */
    generateRequestId() {
        return crypto.randomBytes(16).toString('hex');
    }
    /**
     * Load HTLC requests from storage
     */
    loadRequests() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf8');
                const requests = JSON.parse(data);
                // Populate the map
                requests.forEach(request => {
                    this.htlcRequests.set(request.id, request);
                });
                console.log(`Loaded ${requests.length} HTLC requests from storage`);
            }
            else {
                console.log('No HTLC requests found in storage');
            }
        }
        catch (error) {
            console.error('Error loading HTLC requests:', error);
        }
    }
    /**
     * Save HTLC requests to storage
     */
    saveRequests() {
        try {
            const requests = Array.from(this.htlcRequests.values());
            fs.writeFileSync(this.storagePath, JSON.stringify(requests, null, 2));
        }
        catch (error) {
            console.error('Error saving HTLC requests:', error);
        }
    }
    /**
     * Create a new HTLC request
     */
    async createHtlcRequest(requestData) {
        const id = this.generateRequestId();
        const request = {
            id,
            ...requestData
        };
        this.htlcRequests.set(id, request);
        this.saveRequests();
        return id;
    }
    /**
     * Get an HTLC request by ID
     */
    async getHtlcRequest(id) {
        return this.htlcRequests.get(id) || null;
    }
    /**
     * Get an HTLC request by contract address
     */
    async getHtlcRequestByContractAddress(contractAddress) {
        for (const request of this.htlcRequests.values()) {
            if (request.contractAddress === contractAddress) {
                return request;
            }
        }
        return null;
    }
    /**
     * Update an HTLC request
     */
    async updateHtlcRequest(id, updates) {
        const request = this.htlcRequests.get(id);
        if (!request) {
            return null;
        }
        // Update the request
        const updatedRequest = {
            ...request,
            ...updates
        };
        this.htlcRequests.set(id, updatedRequest);
        this.saveRequests();
        return updatedRequest;
    }
    /**
     * Get all HTLC requests
     */
    async getAllHtlcRequests() {
        return Array.from(this.htlcRequests.values());
    }
    /**
     * Get HTLC requests by status
     */
    async getHtlcRequestsByStatus(status) {
        return Array.from(this.htlcRequests.values()).filter(request => request.status === status);
    }
    /**
     * Delete an HTLC request
     */
    async deleteHtlcRequest(id) {
        const deleted = this.htlcRequests.delete(id);
        if (deleted) {
            this.saveRequests();
        }
        return deleted;
    }
    /**
     * Mark an HTLC as funded
     */
    async markHtlcAsFunded(id, expiresAt) {
        return this.updateHtlcRequest(id, {
            status: 'funded',
            fundedAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString()
        });
    }
    /**
     * Mark an HTLC as redeemed
     */
    async markHtlcAsRedeemed(id, redeemTxId) {
        return this.updateHtlcRequest(id, {
            status: 'redeemed',
            redeemedAt: new Date().toISOString(),
            redeemTxId
        });
    }
    /**
     * Mark an HTLC as refunded
     */
    async markHtlcAsRefunded(id, refundTxId) {
        return this.updateHtlcRequest(id, {
            status: 'refunded',
            refundedAt: new Date().toISOString(),
            refundTxId
        });
    }
    /**
     * Mark an HTLC as expired
     */
    async markHtlcAsExpired(id) {
        return this.updateHtlcRequest(id, {
            status: 'expired'
        });
    }
}
exports.HtlcService = HtlcService;
