const express = require('express');
const { createHTLC, redeemHTLC, refundHTLC } = require('./htlc');
const { ECPairFactory } = require('ecpair');
const ecc = require('tiny-secp256k1');
const crypto = require('crypto');
const bitcoin = require('bitcoinjs-lib');
const fs = require('fs');
const path = require('path');

// Initialize ECPair for Bitcoin key handling
const ECPair = ECPairFactory(ecc);

// Storage path for HTLC requests
const STORAGE_PATH = path.join(__dirname, '../../data/htlc_requests.json');

// Ensure storage directory exists
if (!fs.existsSync(path.dirname(STORAGE_PATH))) {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
}

// Initialize storage
let htlcRequests = [];
try {
  if (fs.existsSync(STORAGE_PATH)) {
    const data = fs.readFileSync(STORAGE_PATH, 'utf8');
    if (data) {
      htlcRequests = JSON.parse(data);
    }
  }
} catch (error) {
  console.error('Error loading HTLC storage:', error);
  // Initialize with empty array on error
  htlcRequests = [];
}

// Save HTLC requests to storage
function saveHtlcRequests() {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(htlcRequests, null, 2));
    console.log(`Saved ${htlcRequests.length} HTLC requests to storage`);
  } catch (error) {
    console.error('Error saving HTLC requests:', error);
  }
}

/**
 * Create an ordinal HTLC endpoint
 */
function setupOrdinalHtlcApi(app) {
  // Create a new ordinal HTLC
  app.post('/api/htlc/create-ordinal-htlc', (req, res) => {
    try {
      const { recipientAddress, refundAddress } = req.body;

      if (!recipientAddress || !refundAddress) {
        return res.status(400).json({ 
          error: 'Missing required parameters: recipientAddress and refundAddress are required' 
        });
      }

      // Validate Bitcoin addresses
      if (!isValidBitcoinAddress(recipientAddress)) {
        return res.status(400).json({ 
          error: `Invalid recipient address: ${recipientAddress}` 
        });
      }

      if (!isValidBitcoinAddress(refundAddress)) {
        return res.status(400).json({ 
          error: `Invalid refund address: ${refundAddress}` 
        });
      }

      // Generate a unique timelock expiration (current time + 3 days in blocks)
      // Using 144 blocks per day (10 min per block on average)
      const currentBlockHeight = getCurrentBlockEstimate();
      const timelock = currentBlockHeight + (144 * 3); // 3 days worth of blocks

      // Create the HTLC
      const htlc = createHTLC({
        recipientAddress,
        refundAddress,
        network: 'bitcoin', // Use mainnet
        expiration: timelock
      });

      // Create a request ID
      const id = `htlc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Store the HTLC for later reference
      const htlcRequest = {
        id,
        timestamp: Date.now(),
        status: 'created',
        htlcAddress: htlc.htlcAddress,
        recipientAddress,
        refundAddress,
        timelock: htlc.expiration,
        witnessScript: htlc.witnessScript,
        preimage: htlc.preimage,
        contractHash: htlc.contractHash
      };

      htlcRequests.push(htlcRequest);
      saveHtlcRequests();

      // Return the HTLC data (excluding sensitive information)
      return res.status(200).json({
        message: 'Ordinal HTLC created successfully',
        htlcData: {
          id: htlcRequest.id,
          htlcAddress: htlc.htlcAddress,
          recipientAddress,
          refundAddress,
          timelock: htlc.expiration
        },
        instructions: `Send your ordinal to ${htlc.htlcAddress}. It will be locked until block ${htlc.expiration}, after which you can claim it via the refund path.`
      });
    } catch (error) {
      console.error('Error creating ordinal HTLC:', error);
      return res.status(500).json({ 
        error: 'Failed to create ordinal HTLC', 
        details: error.message 
      });
    }
  });

  // Get HTLC status endpoint
  app.get('/api/htlc/status/:requestId', (req, res) => {
    try {
      const { requestId } = req.params;
      const htlcRequest = htlcRequests.find(r => r.id === requestId);

      if (!htlcRequest) {
        return res.status(404).json({ error: 'HTLC request not found' });
      }

      // Determine if refund is available based on current block height
      const currentBlockHeight = getCurrentBlockEstimate();
      const canRefund = currentBlockHeight >= htlcRequest.timelock;

      // Return status (excluding sensitive information)
      return res.status(200).json({
        id: htlcRequest.id,
        status: htlcRequest.status,
        htlcAddress: htlcRequest.htlcAddress,
        recipientAddress: htlcRequest.recipientAddress,
        refundAddress: htlcRequest.refundAddress,
        timelock: htlcRequest.timelock,
        currentBlock: currentBlockHeight,
        canRefund,
        blocksRemaining: Math.max(0, htlcRequest.timelock - currentBlockHeight)
      });
    } catch (error) {
      console.error('Error getting HTLC status:', error);
      return res.status(500).json({ 
        error: 'Failed to get HTLC status', 
        details: error.message 
      });
    }
  });

  // Execute refund endpoint
  app.post('/api/htlc/execute-refund', (req, res) => {
    try {
      const { requestId, destinationAddress } = req.body;

      if (!requestId || !destinationAddress) {
        return res.status(400).json({ 
          error: 'Missing required parameters: requestId and destinationAddress are required' 
        });
      }

      const htlcRequest = htlcRequests.find(r => r.id === requestId);
      if (!htlcRequest) {
        return res.status(404).json({ error: 'HTLC request not found' });
      }

      // Validate destination address
      if (!isValidBitcoinAddress(destinationAddress)) {
        return res.status(400).json({ 
          error: `Invalid destination address: ${destinationAddress}` 
        });
      }

      // Check if timelock has expired
      const currentBlockHeight = getCurrentBlockEstimate();
      if (currentBlockHeight < htlcRequest.timelock) {
        return res.status(400).json({ 
          error: 'Timelock has not expired yet',
          currentBlock: currentBlockHeight,
          timelock: htlcRequest.timelock,
          blocksRemaining: htlcRequest.timelock - currentBlockHeight
        });
      }

      // For demonstrating the API flow, we're returning a simulated TXID
      // In a production environment, you would:
      // 1. Look up the UTXO for the HTLC address
      // 2. Create an actual refund transaction
      // 3. Sign it with the necessary keys
      // 4. Broadcast to the Bitcoin network
      const simulatedTxid = `refund_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Update request status
      htlcRequest.status = 'refunded';
      htlcRequest.refundTxid = simulatedTxid;
      saveHtlcRequests();

      return res.status(200).json({
        message: 'Refund transaction simulated successfully',
        txid: simulatedTxid,
        explorerUrl: `https://mempool.space/tx/${simulatedTxid}`
      });
    } catch (error) {
      console.error('Error executing refund:', error);
      return res.status(500).json({ 
        error: 'Failed to execute refund', 
        details: error.message 
      });
    }
  });
}

/**
 * Validate a Bitcoin address
 * Simple validation for demonstration - production code should be more robust
 */
function isValidBitcoinAddress(address) {
  try {
    // Validate the address format based on prefix
    // Note: This is a simplified validation
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
    console.error('Error validating Bitcoin address:', error);
    return false;
  }
}

/**
 * Get current block height estimate
 * In production, you would query a Bitcoin node or API service
 */
function getCurrentBlockEstimate() {
  // This is a placeholder. In production, you would:
  // 1. Query a Bitcoin node RPC
  // 2. Or use a public API like Blockstream's
  
  // For now, use a hardcoded height close to current mainnet height
  // Add ~144 blocks per day since this fixed value
  const baseHeight = 840000; // Approximate height as of early 2024
  const daysSinceBase = Math.floor((Date.now() - new Date('2024-03-01').getTime()) / (1000 * 60 * 60 * 24));
  return baseHeight + (daysSinceBase * 144);
}

module.exports = { setupOrdinalHtlcApi }; 