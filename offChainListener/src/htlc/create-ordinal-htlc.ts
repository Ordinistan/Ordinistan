import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { createHTLC } from "./htlc";
import * as bitcoin from "bitcoinjs-lib";
import * as cryptoModule from "crypto";
import * as bip39 from "bip39";
import { BIP32Factory } from "bip32";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);

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
export function createOrdinalHtlc(btcAddress: string, timeDuration = 72): {
  htlcAddress: string;
  timelock: number;
  refundAddress: string;
  witnessScript: string;
  preimage: string;
  contractHash: string;
  isOrdinal: boolean;
  timeDurationHours: number;
  refundKeyDerivationPath: string; // Add this to track the derivation path
} {
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
    const refundAddress = serverP2wpkh.address!;
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

    const htlc = createHTLC({
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
  } catch (error) {
    console.error("Error creating ordinal HTLC:", error);
    throw error;
  }
}

/**
 * Validates if a string is a valid Bitcoin address
 */
export function isValidBitcoinAddress(address: string): boolean {
  try {
    console.log(`Validating Bitcoin address: ${address}`);
    
    // Simply use regex patterns for validation
    if (address.startsWith('1')) {
      // Legacy address (P2PKH)
      return /^1[a-zA-HJ-NP-Z0-9]{25,34}$/.test(address);
    } else if (address.startsWith('3')) {
      // P2SH address
      return /^3[a-zA-HJ-NP-Z0-9]{25,34}$/.test(address);
    } else if (address.startsWith('bc1q')) {
      // Segwit address (P2WPKH)
      return /^bc1q[a-zA-HJ-NP-Z0-9]{38,62}$/.test(address);
    } else if (address.startsWith('bc1p')) {
      // Taproot address (P2TR)
      console.log("Taproot address detected");
      // Using a more permissive pattern for Taproot addresses
      return true; // Temporarily accept all bc1p addresses
    }
    
    console.log(`Address format not recognized: ${address}`);
    return false;
  } catch (error) {
    console.error("Error validating Bitcoin address:", error);
    return false;
  }
}
