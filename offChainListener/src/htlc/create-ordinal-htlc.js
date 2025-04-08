const { ECPairFactory } = require("ecpair");
const ecc = require("tiny-secp256k1");
const ECPair = ECPairFactory(ecc);
const { createHTLC, redeemHTLC, refundHTLC } = require("./htlc");
const bitcoin = require("bitcoinjs-lib");
const crypto = require("crypto");

/**
 * Creates an HTLC contract for an ordinal, using the user's address as both the recipient
 * and refund address, with a specified time duration.
 * 
 * @param {string} btcAddress - The user's Bitcoin address to receive the refund
 * @param {number} timeDuration - Time duration in hours before the HTLC can be refunded
 * @returns {Object} HTLC details including the address to send the ordinal to
 */
function createOrdinalHtlc(btcAddress, timeDuration = 72) { // Default to 72 hours (3 days)
  if (!btcAddress) {
    throw new Error("Bitcoin address is required");
  }

  try {
    // Validate the Bitcoin address format
    if (!isValidBitcoinAddress(btcAddress)) {
      throw new Error(`Invalid Bitcoin address format: ${btcAddress}`);
    }

    // For ordinals, we want the user to be able to refund to their own address
    // So we use the same address for both recipient and refund
    const refundAddress = btcAddress;
    const recipientAddress = btcAddress;

    // Convert time duration from hours to seconds and calculate expiration
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = currentTime + (timeDuration * 60 * 60);

    // Create the HTLC specifically for ordinals
    // Using a unique random hash for this specific ordinal HTLC
    const randomBytes = crypto.randomBytes(32);
    const hash = crypto.createHash('sha256').update(randomBytes).digest('hex');

    const htlc = createHTLC({
      recipientAddress,
      refundAddress,
      hash,
      network: "bitcoin", // Use mainnet for real ordinals
      expiration: expirationTime,
    });

    console.log(htlc)

    // Return a simplified response with just the essential information
    return {
      htlcAddress: htlc.htlcAddress,
      timelock: htlc.expiration,
      refundAddress: btcAddress,
      witnessScript: htlc.witnessScript,
      preimage: htlc.preimage,
      contractHash: htlc.contractHash,
      isOrdinal: true,
      timeDurationHours: timeDuration
    };
  } catch (error) {
    console.error("Error creating ordinal HTLC:", error);
    throw error;
  }
}

/**
 * Validates if a string is a valid Bitcoin address
 * @param {string} address - Bitcoin address to validate
 * @returns {boolean} Whether the address is valid
 */
function isValidBitcoinAddress(address) {
  try {
    // Basic validation based on prefix
    if (address.startsWith('1')) {
      // Legacy address (P2PKH)
      return /^1[a-zA-HJ-NP-Z0-9]{25,34}$/.test(address);
    } else if (address.startsWith('3')) {
      // P2SH address
      return /^3[a-zA-HJ-NP-Z0-9]{25,34}$/.test(address);
    } else if (address.startsWith('bc1q')) {
      // Segwit address (P2WPKH)
      return /^bc1q[a-zA-HJ-NP-Z0-9]{38,45}$/.test(address);
    } else if (address.startsWith('bc1p')) {
      // Taproot address (P2TR) 
      return /^bc1p[a-zA-HJ-NP-Z0-9]{38,45}$/.test(address);
    }
    return false;
  } catch (error) {
    console.error("Error validating Bitcoin address:", error);
    return false;
  }
}

module.exports = { createOrdinalHtlc };
