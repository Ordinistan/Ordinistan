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
exports.setupOrdinalHtlcApi = setupOrdinalHtlcApi;
const create_ordinal_htlc_1 = require("./create-ordinal-htlc");
const refund_ordinal_htlc_1 = require("./refund-ordinal-htlc");
const uuid_1 = require("uuid");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Path for storing HTLC requests
const STORAGE_PATH = path.join(__dirname, '../../data/htlc-requests.json');
// Ensure the directory exists
const dirPath = path.dirname(STORAGE_PATH);
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
}
// Load existing HTLC requests or initialize empty array
let htlcRequests = [];
try {
    if (fs.existsSync(STORAGE_PATH)) {
        const data = fs.readFileSync(STORAGE_PATH, 'utf8');
        if (data && data.trim()) {
            htlcRequests = JSON.parse(data);
        }
        else {
            // Initialize with empty array if file is empty
            htlcRequests = [];
            // Save the empty array to the file
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(htlcRequests, null, 2));
            console.log('Initialized empty HTLC requests file');
        }
    }
    else {
        // Create the file with an empty array if it doesn't exist
        fs.writeFileSync(STORAGE_PATH, JSON.stringify([], null, 2));
        console.log('Created new HTLC requests file');
    }
}
catch (error) {
    console.error('Error loading HTLC requests:', error);
    // If there was an error parsing the file, initialize with empty array and save it
    htlcRequests = [];
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(htlcRequests, null, 2));
    console.log('Reset HTLC requests file due to parsing error');
}
// Save HTLC requests to file
function saveHtlcRequests() {
    try {
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(htlcRequests, null, 2));
    }
    catch (error) {
        console.error('Error saving HTLC requests:', error);
    }
}
/**
 * Sets up the HTLC API routes
 * @param app Express application
 */
function setupOrdinalHtlcApi(app) {
    // Endpoint to create a new HTLC for ordinals
    app.post('/api/htlc/create-ordinal-htlc', (req, res) => {
        try {
            const { btcAddress, timeDuration } = req.body;
            if (!btcAddress) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Missing required parameter: btcAddress',
                        details: 'A valid Bitcoin address is required to create an HTLC'
                    }
                });
            }
            if (!(0, create_ordinal_htlc_1.isValidBitcoinAddress)(btcAddress)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Invalid Bitcoin address',
                        details: 'The provided Bitcoin address is not valid'
                    }
                });
            }
            // Create a unique ID for this request
            const requestId = (0, uuid_1.v4)();
            // Create new HTLC request entry
            const htlcRequest = {
                id: requestId,
                timestamp: Date.now(),
                btcAddress,
                status: 'pending'
            };
            try {
                // Create the HTLC
                const htlc = (0, create_ordinal_htlc_1.createOrdinalHtlc)(btcAddress, timeDuration);
                // Update the request with HTLC details
                htlcRequest.status = 'created';
                htlcRequest.htlcAddress = htlc.htlcAddress;
                htlcRequest.preimage = htlc.preimage;
                htlcRequest.contractHash = htlc.contractHash;
                htlcRequest.witnessScript = htlc.witnessScript;
                htlcRequest.timelock = htlc.timelock;
                htlcRequest.timeDurationHours = htlc.timeDurationHours;
                htlcRequest.isOrdinal = htlc.isOrdinal;
                htlcRequest.refundKeyDerivationPath = htlc.refundKeyDerivationPath;
                // Save the updated requests
                htlcRequests.push(htlcRequest);
                saveHtlcRequests();
                // Return success with HTLC details
                return res.status(200).json({
                    success: true,
                    requestId,
                    ...htlc
                });
            }
            catch (error) {
                const err = error;
                // Handle HTLC creation error
                htlcRequest.status = 'failed';
                htlcRequest.error = {
                    message: 'Failed to create HTLC',
                    details: err.message
                };
                // Save the failed request
                htlcRequests.push(htlcRequest);
                saveHtlcRequests();
                // Return error response
                return res.status(500).json({
                    success: false,
                    requestId,
                    error: {
                        message: 'Failed to create HTLC',
                        details: err.message
                    }
                });
            }
        }
        catch (error) {
            const err = error;
            // Handle unexpected errors
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Unexpected error creating HTLC',
                    details: err.message
                }
            });
        }
    });
    // Endpoint to get the status of an HTLC request
    app.get('/api/htlc/status/:requestId', (req, res) => {
        try {
            const requestId = req.params.requestId;
            // Find the HTLC request with the given ID
            const htlcRequest = htlcRequests.find(r => r.id === requestId);
            if (!htlcRequest) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'HTLC request not found',
                        details: `No HTLC request found with ID: ${requestId}`
                    }
                });
            }
            // Return the HTLC request details
            return res.status(200).json({
                success: true,
                htlcRequest
            });
        }
        catch (error) {
            const err = error;
            // Handle unexpected errors
            return res.status(500).json({
                success: false,
                error: {
                    message: 'Unexpected error getting HTLC status',
                    details: err.message
                }
            });
        }
    });
    // Endpoint to execute a refund for an HTLC
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
            try {
                const refundTx = await (0, refund_ordinal_htlc_1.refundOrdinalHtlc)(btcAddress, htlcAddress);
                // Ensure refundTx is not empty
                if (!refundTx) {
                    throw new Error('Refund transaction creation failed - empty response');
                }
                return res.status(200).json({
                    success: true,
                    message: 'Refund transaction created successfully',
                    refundTx
                });
            }
            catch (error) {
                console.error('Error executing refund:', error);
                // Check if it's a timelock error
                if (error.message.includes('Timelock has not expired yet')) {
                    return res.status(400).json({
                        success: false,
                        error: 'Timelock not expired',
                        details: error.message
                    });
                }
                // Check if it's a UTXO error
                if (error.message.includes('No UTXO found')) {
                    return res.status(400).json({
                        success: false,
                        error: 'No funds found',
                        details: error.message
                    });
                }
                throw error; // Re-throw the error to be caught by the outer catch block
            }
        }
        catch (error) {
            console.error('Error in refund endpoint:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to refund ordinal HTLC',
                details: error.message
            });
        }
    });
}
// Export the setup function
exports.default = setupOrdinalHtlcApi;
