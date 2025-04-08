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
exports.createOrdinalHtlc = createOrdinalHtlc;
exports.isValidBitcoinAddress = isValidBitcoinAddress;
const ecpair_1 = require("ecpair");
const ecc = __importStar(require("tiny-secp256k1"));
const htlc_1 = require("./htlc");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const cryptoModule = __importStar(require("crypto"));
const bip39 = __importStar(require("bip39"));
const bip32_1 = require("bip32");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
const bip32 = (0, bip32_1.BIP32Factory)(ecc);
// Consistent derivation path for HTLC refund keys
const HTLC_DERIVATION_PATH = "m/44'/0'/0'/0/0";
const mnemonic = process.env.MNEMONIC;
// Function to generate a keypair from mnemonic with consistent derivation path
function getHtlcKeyPair() {
    if (!mnemonic) {
        throw new Error("MNEMONIC is not defined in the environment variables");
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
    const child = root.derivePath(HTLC_DERIVATION_PATH);
    if (!child.privateKey) {
        throw new Error("Could not derive private key from mnemonic");
    }
    const privateKeyBuffer = Buffer.from(child.privateKey);
    return ECPair.fromPrivateKey(privateKeyBuffer, { network: bitcoin.networks.bitcoin });
}
/**
 * Creates an HTLC contract for an ordinal
 * @param btcAddress - The user's Bitcoin address to receive the refund
 * @param timeDuration - Time duration in hours before the HTLC can be refunded
 */
function createOrdinalHtlc(btcAddress, timeDuration = 72) {
    if (!btcAddress) {
        throw new Error("Bitcoin address is required");
    }
    try {
        // Validate the Bitcoin address format
        if (!isValidBitcoinAddress(btcAddress)) {
            throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
        }
        // Generate server's keypair for the HTLC refund path
        const serverKeyPair = getHtlcKeyPair();
        const serverP2wpkh = bitcoin.payments.p2wpkh({
            pubkey: serverKeyPair.publicKey,
            network: bitcoin.networks.bitcoin
        });
        // Use the server's address for refund path (controlled by mnemonic)
        const refundAddress = serverP2wpkh.address;
        // Use the user's address for the main path
        const recipientAddress = btcAddress;
        console.log(`Using deterministic refund address: ${refundAddress}`);
        // Convert time duration from hours to seconds and calculate expiration
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = currentTime + (timeDuration * 60 * 60);
        // Create the HTLC specifically for ordinals
        // Using a unique random hash for this specific ordinal HTLC
        const randomBytes = cryptoModule.randomBytes(32);
        const hash = cryptoModule.createHash('sha256').update(randomBytes).digest('hex');
        const htlc = (0, htlc_1.createHTLC)({
            recipientAddress,
            refundAddress,
            hash,
            network: "bitcoin", // Use mainnet for real ordinals
            expiration: expirationTime,
        });
        console.log(htlc);
        // Return a simplified response with just the essential information
        return {
            htlcAddress: htlc.htlcAddress,
            timelock: htlc.expiration,
            refundAddress: refundAddress, // This is now the server's address
            witnessScript: htlc.witnessScript,
            preimage: htlc.preimage,
            contractHash: htlc.contractHash,
            isOrdinal: true,
            timeDurationHours: timeDuration,
            refundKeyDerivationPath: HTLC_DERIVATION_PATH // Include the derivation path
        };
    }
    catch (error) {
        console.error("Error creating ordinal HTLC:", error);
        throw error;
    }
}
/**
 * Validates if a string is a valid Bitcoin address
 */
function isValidBitcoinAddress(address) {
    try {
        console.log(`Validating Bitcoin address: ${address}`);
        // Simply use regex patterns for validation
        if (address.startsWith('1')) {
            // Legacy address (P2PKH)
            return /^1[a-zA-HJ-NP-Z0-9]{25,34}$/.test(address);
        }
        else if (address.startsWith('3')) {
            // P2SH address
            return /^3[a-zA-HJ-NP-Z0-9]{25,34}$/.test(address);
        }
        else if (address.startsWith('bc1q')) {
            // Segwit address (P2WPKH)
            return /^bc1q[a-zA-HJ-NP-Z0-9]{38,62}$/.test(address);
        }
        else if (address.startsWith('bc1p')) {
            // Taproot address (P2TR)
            console.log("Taproot address detected");
            // Using a more permissive pattern for Taproot addresses
            return true; // Temporarily accept all bc1p addresses
        }
        console.log(`Address format not recognized: ${address}`);
        return false;
    }
    catch (error) {
        console.error("Error validating Bitcoin address:", error);
        return false;
    }
}
