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
exports.generatePreimageAndHash = generatePreimageAndHash;
exports.getCurrentBlockHeight = getCurrentBlockHeight;
exports.createOrdinalHtlc = createOrdinalHtlc;
exports.checkHtlcStatus = checkHtlcStatus;
exports.executeHtlcRefund = executeHtlcRefund;
exports.isValidBitcoinAddress = isValidBitcoinAddress;
exports.createRefundTransaction = createRefundTransaction;
exports.findOrdinalUtxo = findOrdinalUtxo;
exports.broadcastTransaction = broadcastTransaction;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecc = __importStar(require("tiny-secp256k1"));
const ecpair_1 = require("ecpair");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Configure bitcoinjs with elliptic curve implementation
bitcoin.initEccLib(ecc);
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
// Configure network - use testnet for development, bitcoin.networks.bitcoin for mainnet
const network = bitcoin.networks.bitcoin;
// Bitcoin API endpoints
const BITCOIN_API_URL = process.env.BITCOIN_API_URL || 'https://blockstream.info/api';
/**
 * Generate a random preimage and its SHA256 hash
 * @returns {Object} Object containing preimage and hash
 */
function generatePreimageAndHash() {
    const preimage = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
    return { preimage, hash };
}
/**
 * Get the current Bitcoin block height
 * @returns {Promise<number>} Current block height
 */
async function getCurrentBlockHeight() {
    try {
        const response = await axios_1.default.get(`${BITCOIN_API_URL}/blocks/tip/height`);
        return response.data;
    }
    catch (error) {
        console.error('Error fetching current block height:', error);
        throw new Error('Failed to fetch current block height');
    }
}
/**
 * Create a Hash Time-Locked Contract for ordinals
 * @param {string} recipientAddress - Bitcoin address of the recipient
 * @param {string} refundAddress - Bitcoin address to refund to if timelock expires
 * @param {number} timelock - Relative timelock in blocks
 * @returns {Promise<Object>} HTLC details
 */
async function createOrdinalHtlc(recipientAddress, refundAddress, timelock) {
    try {
        // Generate preimage and hash
        const { preimage, hash } = generatePreimageAndHash();
        // Convert addresses to output scripts
        const recipientOutputScript = bitcoin.address.toOutputScript(recipientAddress, network);
        const refundOutputScript = bitcoin.address.toOutputScript(refundAddress, network);
        // Create redeem script for HTLC
        const hashBuf = Buffer.from(hash, 'hex');
        // Get hash from addresses - we'll use p2pkh as default format for script
        const recipientAddressInfo = bitcoin.address.fromBase58Check(recipientAddress);
        const refundAddressInfo = bitcoin.address.fromBase58Check(refundAddress);
        // Create a Bitcoin script with OP_IF branch for spending with preimage
        // and OP_ELSE branch for refunding after timelock expiry
        const redeemScript = bitcoin.script.compile([
            bitcoin.opcodes.OP_IF,
            bitcoin.opcodes.OP_SHA256,
            hashBuf,
            bitcoin.opcodes.OP_EQUALVERIFY,
            bitcoin.opcodes.OP_DUP,
            bitcoin.opcodes.OP_HASH160,
            recipientAddressInfo.hash,
            bitcoin.opcodes.OP_EQUALVERIFY,
            bitcoin.opcodes.OP_CHECKSIG,
            bitcoin.opcodes.OP_ELSE,
            bitcoin.script.number.encode(timelock),
            bitcoin.opcodes.OP_CHECKSEQUENCEVERIFY,
            bitcoin.opcodes.OP_DROP,
            bitcoin.opcodes.OP_DUP,
            bitcoin.opcodes.OP_HASH160,
            refundAddressInfo.hash,
            bitcoin.opcodes.OP_EQUALVERIFY,
            bitcoin.opcodes.OP_CHECKSIG,
            bitcoin.opcodes.OP_ENDIF
        ]);
        // Create P2SH address from redeem script
        const p2sh = bitcoin.payments.p2sh({
            redeem: { output: redeemScript, network },
            network
        });
        const contractAddress = p2sh.address;
        return {
            contractAddress,
            redeemScript: redeemScript.toString('hex'),
            preimage,
            hash,
            timelock,
            recipientAddress,
            refundAddress
        };
    }
    catch (error) {
        console.error('Error creating HTLC:', error);
        throw new Error(`Failed to create HTLC: ${error.message}`);
    }
}
/**
 * Check the status of an HTLC
 * @param {string} contractAddress - P2SH address of the HTLC
 * @returns {Promise<Object>} Status information
 */
async function checkHtlcStatus(contractAddress) {
    try {
        // Get balance and transactions
        const addressInfoResponse = await axios_1.default.get(`${BITCOIN_API_URL}/address/${contractAddress}`);
        const txHistoryResponse = await axios_1.default.get(`${BITCOIN_API_URL}/address/${contractAddress}/txs`);
        // Check if the address has ordinals (this would require additional API)
        // For simplicity, we'll assume it has ordinals if it has a balance
        const balance = addressInfoResponse.data.chain_stats.funded_txo_sum -
            addressInfoResponse.data.chain_stats.spent_txo_sum;
        return {
            balance,
            hasOrdinals: balance > 0,
            transactions: txHistoryResponse.data
        };
    }
    catch (error) {
        console.error('Error checking HTLC status:', error);
        throw new Error('Failed to check HTLC status');
    }
}
/**
 * Execute a refund for an HTLC
 * @param {string} redeemScript - Hex-encoded redeem script
 * @param {string} contractAddress - P2SH address of the HTLC
 * @param {string} destinationAddress - Bitcoin address to send refund to
 * @param {string} privateKey - Private key for refund address
 * @returns {Promise<string>} Transaction ID
 */
async function executeHtlcRefund(redeemScript, contractAddress, destinationAddress, privateKey) {
    try {
        // Get UTXOs for the contract address
        const utxosResponse = await axios_1.default.get(`${BITCOIN_API_URL}/address/${contractAddress}/utxo`);
        const utxos = utxosResponse.data;
        if (utxos.length === 0) {
            throw new Error('No UTXOs found for the contract address');
        }
        // Create a new transaction
        const psbt = new bitcoin.Psbt({ network });
        let totalInput = 0;
        // Add inputs
        for (const utxo of utxos) {
            psbt.addInput({
                hash: utxo.txid,
                index: utxo.vout,
                witnessUtxo: {
                    script: bitcoin.address.toOutputScript(contractAddress, network),
                    value: utxo.value
                },
                redeemScript: Buffer.from(redeemScript, 'hex')
            });
            totalInput += utxo.value;
        }
        // Calculate fee (simplified)
        const fee = 5000; // 5000 satoshis
        const outputAmount = totalInput - fee;
        // Add output
        psbt.addOutput({
            address: destinationAddress,
            value: outputAmount
        });
        // Sign inputs
        const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
        for (let i = 0; i < utxos.length; i++) {
            // Cast keyPair to any to avoid the type mismatch issue
            psbt.signInput(i, keyPair);
        }
        // Finalize and build
        psbt.finalizeAllInputs();
        const tx = psbt.extractTransaction();
        const txHex = tx.toHex();
        // Broadcast transaction
        const broadcastResponse = await axios_1.default.post(`${BITCOIN_API_URL}/tx`, txHex);
        return broadcastResponse.data; // Transaction ID
    }
    catch (error) {
        console.error('Error executing HTLC refund:', error);
        throw new Error(`Failed to execute HTLC refund: ${error.message}`);
    }
}
/**
 * Validate Bitcoin address format
 * @param {string} address - Bitcoin address to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidBitcoinAddress(address) {
    try {
        bitcoin.address.toOutputScript(address, network);
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Create a transaction to refund an ordinal from an HTLC via timelock path
 * @param options - Transaction options
 * @returns Raw signed transaction hex
 */
async function createRefundTransaction(options) {
    const { utxo, destinationAddress, witnessScript, signerWIF, timelock, feeRate = 10 } = options;
    // Create the transaction
    const psbt = new bitcoin.Psbt({ network: network });
    // Add the input with sequence set for timelocked transactions
    psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: 0xfffffffe, // Enable nLockTime
        witnessUtxo: {
            script: bitcoin.payments.p2wsh({
                redeem: {
                    output: Buffer.isBuffer(witnessScript) ? witnessScript : Buffer.from(witnessScript, 'hex'),
                    network: network
                },
                network: network
            }).output,
            value: utxo.value
        },
        witnessScript: Buffer.isBuffer(witnessScript) ? witnessScript : Buffer.from(witnessScript, 'hex')
    });
    // Add locktime to the transaction
    psbt.setLocktime(timelock);
    // Ordinals require preserving the output index
    // Calculate fee (minimum 1000 sats for ordinals transactions)
    const fee = Math.max(1000, feeRate * 250); // Estimate 250 vbytes
    // Add the output (preserve output index for ordinals)
    psbt.addOutput({
        address: destinationAddress,
        value: utxo.value - fee
    });
    // Sign the transaction
    const keyPair = ECPair.fromWIF(signerWIF, network);
    try {
        psbt.signInput(0, keyPair);
        // Finalize the input
        psbt.finalizeInput(0, (inputIndex, input) => {
            // Create the witness stack for timelocked path
            // [signature, <1>, redeemScript]
            const signature = input.partialSig[0].signature;
            return {
                finalScriptWitness: bitcoin.script.compile([
                    signature,
                    Buffer.from([1]), // OP_TRUE for timelock path
                    Buffer.isBuffer(witnessScript) ? witnessScript : Buffer.from(witnessScript, 'hex')
                ])
            };
        });
        // Extract and return the transaction
        const tx = psbt.extractTransaction();
        return tx.toHex();
    }
    catch (error) {
        console.error('Error signing transaction:', error);
        throw error;
    }
}
/**
 * Find a UTXO for a specific address that contains an ordinal
 * @param address Bitcoin address to search
 * @returns UTXO with the ordinal or null if not found
 */
async function findOrdinalUtxo(address) {
    try {
        // Query mempool.space API to get UTXOs for the address
        const response = await axios_1.default.get(`https://mempool.space/api/address/${address}/utxo`);
        if (!response.data || response.data.length === 0) {
            return null;
        }
        // For ordinals, we typically look for the smallest output (546 sats)
        // This is a simplification - in a production environment you'd use Ordinals-specific APIs
        // to properly identify outputs containing ordinals
        const ordinalUtxos = response.data.filter((utxo) => utxo.value === 546);
        if (ordinalUtxos.length > 0) {
            const utxo = ordinalUtxos[0];
            return {
                txid: utxo.txid,
                vout: utxo.vout,
                value: utxo.value
            };
        }
        // If no 546 sat outputs, return the smallest output as a fallback
        const smallestUtxo = response.data.sort((a, b) => a.value - b.value)[0];
        return {
            txid: smallestUtxo.txid,
            vout: smallestUtxo.vout,
            value: smallestUtxo.value
        };
    }
    catch (error) {
        console.error('Error finding ordinal UTXO:', error);
        return null;
    }
}
/**
 * Broadcast a raw transaction to the Bitcoin network
 * @param txHex Raw transaction hex
 * @returns Transaction ID
 */
async function broadcastTransaction(txHex) {
    try {
        // Use mempool.space API to broadcast
        const response = await axios_1.default.post('https://mempool.space/api/tx', txHex, {
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        return response.data; // Returns txid
    }
    catch (error) {
        console.error('Failed to broadcast transaction:', error);
        if (error.response && error.response.data) {
            console.error('API Error:', error.response.data);
        }
        throw error;
    }
}
