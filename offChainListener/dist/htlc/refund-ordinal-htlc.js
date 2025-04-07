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
exports.mnemonicToWIF = mnemonicToWIF;
exports.refundOrdinalHtlc = refundOrdinalHtlc;
const htlc_1 = require("./htlc");
const bip39 = __importStar(require("bip39"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bip32_1 = require("bip32");
const ecc = __importStar(require("tiny-secp256k1"));
const ecpair_1 = require("ecpair");
const dotenv_1 = __importDefault(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
const mnemonic = process.env.MNEMONIC;
const MEMPOOL_API = "https://mempool.space/api";
const bip32 = (0, bip32_1.BIP32Factory)(ecc);
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
// Use the same derivation path as in create-ordinal-htlc.ts
const HTLC_DERIVATION_PATH = "m/44'/0'/0'/0/0";
// Path to the HTLC requests file
const STORAGE_PATH = path.join(__dirname, "../../data/htlc-requests.json");
// Ensure the directory exists
const dirPath = path.dirname(STORAGE_PATH);
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
}
function mnemonicToWIF(path = HTLC_DERIVATION_PATH) {
    if (!mnemonic) {
        throw new Error("MNEMONIC is not defined in the environment variables");
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
    const child = root.derivePath(path);
    if (!child.privateKey) {
        throw new Error("Could not derive private key from mnemonic");
    }
    const privateKeyBuffer = Buffer.from(child.privateKey);
    const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, { network: bitcoin.networks.bitcoin });
    // Log the derived address to confirm it matches the refund address in the HTLC
    const p2wpkh = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.bitcoin
    });
    console.log(`Using refund address from mnemonic: ${p2wpkh.address}`);
    return keyPair.toWIF();
}
async function getUtxoForAddress(address) {
    try {
        const response = await axios_1.default.get(`${MEMPOOL_API}/address/${address}/utxo`);
        const utxos = response.data;
        if (!utxos || utxos.length === 0) {
            return null;
        }
        // Get the most recent UTXO (assuming it's the ordinal)
        return utxos[0];
    }
    catch (error) {
        console.error("Error fetching UTXOs:", error);
        return null;
    }
}
// New function to broadcast the transaction
async function broadcastTransaction(txHex) {
    try {
        // Try mempool.space API first
        try {
            console.log("Broadcasting via mempool.space API");
            const response = await axios_1.default.post(`${MEMPOOL_API}/tx`, txHex, {
                headers: { 'Content-Type': 'text/plain' }
            });
            console.log("Broadcast successful via mempool.space:", response.data);
            return `Transaction broadcast via mempool.space: ${response.data}`;
        }
        catch (error) {
            console.warn("Failed to broadcast via mempool.space:", error.message);
            if (error.response?.data) {
                console.log("Error details from mempool.space:", error.response.data);
            }
            // Fallback to blockchain.info
            try {
                console.log("Broadcasting via blockchain.info");
                const response = await axios_1.default.post("https://blockchain.info/pushtx", new URLSearchParams({ tx: txHex }).toString(), {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }
                });
                console.log("Broadcast successful via blockchain.info:", response.data);
                return "Transaction broadcast via blockchain.info";
            }
            catch (error) {
                console.warn("Failed to broadcast via blockchain.info:", error.message);
                if (error.response?.data) {
                    console.log("Error details from blockchain.info:", error.response.data);
                }
                // Fallback to blockstream
                console.log("Broadcasting via blockstream.info");
                const response = await axios_1.default.post("https://blockstream.info/api/tx", txHex, {
                    headers: { "Content-Type": "text/plain" }
                });
                console.log("Broadcast successful via blockstream.info:", response.data);
                return `Transaction broadcast via blockstream.info: ${response.data}`;
            }
        }
    }
    catch (error) {
        console.error("Error broadcasting transaction:", error);
        throw new Error(`Failed to broadcast transaction: ${error.message}`);
    }
}
async function refundOrdinalHtlc(btcAddress, htlcAddress) {
    if (!btcAddress || !htlcAddress) {
        throw new Error("Missing required parameters: btcAddress and htlcAddress");
    }
    // Find HTLC data in the JSON file
    const htlcRequests = loadHtlcRequests();
    const htlcRequest = htlcRequests.find((r) => r.btcAddress === btcAddress && r.htlcAddress === htlcAddress);
    if (!htlcRequest) {
        throw new Error("HTLC not found for the provided btcAddress and htlcAddress");
    }
    // Check if status is already refunded
    if (htlcRequest.status === "refunded") {
        throw new Error("This HTLC has already been refunded");
    }
    // Check if timelock has expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < htlcRequest.timelock) {
        throw new Error(`Timelock has not expired yet. It will expire at ${new Date(htlcRequest.timelock * 1000).toISOString()}`);
    }
    // Generate WIF from mnemonic - use the stored derivation path if available
    const derivationPath = htlcRequest.refundKeyDerivationPath || HTLC_DERIVATION_PATH;
    console.log(`Using derivation path for refund: ${derivationPath}`);
    const refundWIF = mnemonicToWIF(derivationPath);
    // Get UTXO information for the HTLC address
    const utxo = await getUtxoForAddress(htlcAddress);
    if (!utxo) {
        throw new Error(`No UTXO found for HTLC address ${htlcAddress}. Make sure the ordinal has been sent to the HTLC address.`);
    }
    console.log("Found UTXO:", utxo);
    try {
        console.log("Creating refund transaction...");
        const refundTxHex = (0, htlc_1.refundHTLC)({
            refundWIF: refundWIF,
            witnessScript: htlcRequest.witnessScript,
            txHash: utxo.txid,
            value: utxo.value,
            feeRate: 10, // Default fee rate
            vout: utxo.vout,
        });
        if (!refundTxHex) {
            throw new Error('Failed to create refund transaction - empty response from refundHTLC');
        }
        // Calculate txid from the transaction hex
        const tx = bitcoin.Transaction.fromHex(refundTxHex);
        const txid = tx.getId();
        console.log("Created refund transaction:", {
            txid,
            txHex: refundTxHex
        });
        // Broadcast the transaction
        // console.log("Broadcasting transaction to the network...");
        // let broadcastResult;
        // try {
        //   broadcastResult = await broadcastTransaction(refundTxHex);
        //   console.log("Broadcast result:", broadcastResult);
        //   // Update status in the JSON file
        //   htlcRequest.status = "refunded";
        //   htlcRequest.refundTxId = txid; // Store the txid for future reference
        //   saveHtlcRequests(htlcRequests);
        // } catch (error: any) {
        //   console.error("Error broadcasting transaction:", error);
        //   throw new Error(`Failed to broadcast transaction: ${error.message}`);
        // }
        return {
            txHex: refundTxHex,
            txid,
            //   broadcastResult
        };
    }
    catch (error) {
        console.error("Error creating refund transaction:", error);
        throw new Error(`Failed to create refund transaction: ${error.message}`);
    }
}
// Load HTLC requests from file
function loadHtlcRequests() {
    try {
        if (fs.existsSync(STORAGE_PATH)) {
            const data = fs.readFileSync(STORAGE_PATH, "utf8");
            if (data && data.trim()) {
                return JSON.parse(data);
            }
            else {
                // Initialize with empty array if file is empty
                const emptyArray = [];
                fs.writeFileSync(STORAGE_PATH, JSON.stringify(emptyArray, null, 2));
                console.log('Initialized empty HTLC requests file');
                return emptyArray;
            }
        }
        else {
            // Create the file with an empty array if it doesn't exist
            const emptyArray = [];
            fs.writeFileSync(STORAGE_PATH, JSON.stringify(emptyArray, null, 2));
            console.log('Created new HTLC requests file');
            return emptyArray;
        }
    }
    catch (error) {
        console.error("Error loading HTLC requests:", error);
        // If there was an error parsing the file, initialize with empty array and save it
        const emptyArray = [];
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(emptyArray, null, 2));
        console.log('Reset HTLC requests file due to parsing error');
        return emptyArray;
    }
}
// Save HTLC requests to file
function saveHtlcRequests(htlcRequests) {
    try {
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(htlcRequests, null, 2));
    }
    catch (error) {
        console.error("Error saving HTLC requests:", error);
    }
}
