"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupHtlcApi = setupHtlcApi;
const htlcService_1 = require("./htlcService");
const ordinalHtlc_1 = require("./ordinalHtlc");
/**
 * Set up the HTLC API endpoints
 * @param app Express application
 */
function setupHtlcApi(app) {
    console.log('Setting up HTLC API endpoints...');
    // Create a new instance of the HTLC service
    const htlcService = new htlcService_1.HtlcService();
    /**
     * Create a new HTLC for ordinals
     * POST /api/htlc/create-ordinal-htlc
     */
    app.post('/api/htlc/create-ordinal-htlc', async (req, res) => {
        try {
            const { recipientAddress, refundAddress, timelock } = req.body;
            // Validate required parameters
            if (!recipientAddress || !refundAddress) {
                return res.status(400).json({
                    error: 'Missing required parameters. Please provide recipientAddress and refundAddress.'
                });
            }
            // Validate Bitcoin addresses
            if (!(0, ordinalHtlc_1.isValidBitcoinAddress)(recipientAddress)) {
                return res.status(400).json({
                    error: 'Invalid recipient Bitcoin address.'
                });
            }
            if (!(0, ordinalHtlc_1.isValidBitcoinAddress)(refundAddress)) {
                return res.status(400).json({
                    error: 'Invalid refund Bitcoin address.'
                });
            }
            // Default timelock to 24 hours of blocks if not provided (~144 blocks)
            const timelockValue = timelock || 144;
            // Create HTLC
            const htlcData = await (0, ordinalHtlc_1.createOrdinalHtlc)(recipientAddress, refundAddress, timelockValue);
            // Store HTLC data
            const requestId = await htlcService.createHtlcRequest({
                contractAddress: htlcData.contractAddress,
                recipientAddress: htlcData.recipientAddress,
                refundAddress: htlcData.refundAddress,
                preimage: htlcData.preimage,
                hash: htlcData.hash,
                timelock: htlcData.timelock,
                redeemScript: htlcData.redeemScript,
                status: 'created',
                createdAt: new Date().toISOString(),
                expiresAt: null // Will be calculated based on when funds are received
            });
            // Return HTLC data with instructions
            return res.status(201).json({
                requestId,
                htlcData: {
                    contractAddress: htlcData.contractAddress,
                    preimage: htlcData.preimage, // The secret that recipient will need
                    timelock: htlcData.timelock,
                },
                instructions: `To complete this HTLC, send your ordinals to ${htlcData.contractAddress}. The recipient will need the preimage to claim the ordinals.`
            });
        }
        catch (error) {
            console.error('Error creating HTLC:', error);
            return res.status(500).json({ error: error.message });
        }
    });
    /**
     * Get the status of an HTLC
     * GET /api/htlc/status/:requestId
     */
    app.get('/api/htlc/status/:requestId', async (req, res) => {
        try {
            const { requestId } = req.params;
            // Get HTLC request
            const htlcRequest = await htlcService.getHtlcRequest(requestId);
            if (!htlcRequest) {
                return res.status(404).json({ error: 'HTLC request not found' });
            }
            // Check current status on the blockchain
            const onChainStatus = await (0, ordinalHtlc_1.checkHtlcStatus)(htlcRequest.contractAddress);
            // Get current block height
            const currentBlockHeight = await (0, ordinalHtlc_1.getCurrentBlockHeight)();
            // Determine if the HTLC can be refunded based on timelock
            const canBeRefunded = htlcRequest.status !== 'refunded' &&
                htlcRequest.status !== 'redeemed' &&
                onChainStatus.balance > 0 &&
                (htlcRequest.expiresAt ? new Date(htlcRequest.expiresAt) < new Date() : false);
            return res.status(200).json({
                requestId,
                contractAddress: htlcRequest.contractAddress,
                status: htlcRequest.status,
                createdAt: htlcRequest.createdAt,
                expiresAt: htlcRequest.expiresAt,
                recipientAddress: htlcRequest.recipientAddress,
                refundAddress: htlcRequest.refundAddress,
                timelock: htlcRequest.timelock,
                onChainStatus: {
                    balance: onChainStatus.balance,
                    hasOrdinals: onChainStatus.hasOrdinals,
                    transactionCount: onChainStatus.transactions.length
                },
                currentBlockHeight,
                canBeRefunded
            });
        }
        catch (error) {
            console.error('Error getting HTLC status:', error);
            return res.status(500).json({ error: error.message });
        }
    });
    /**
     * Execute a refund for an HTLC
     * POST /api/htlc/execute-refund
     */
    app.post('/api/htlc/execute-refund', async (req, res) => {
        try {
            const { requestId, destinationAddress } = req.body;
            // Validate required parameters
            if (!requestId || !destinationAddress) {
                return res.status(400).json({
                    error: 'Missing required parameters. Please provide requestId and destinationAddress.'
                });
            }
            // Get HTLC request
            const htlcRequest = await htlcService.getHtlcRequest(requestId);
            if (!htlcRequest) {
                return res.status(404).json({ error: 'HTLC request not found' });
            }
            // Check if the HTLC can be refunded
            const onChainStatus = await (0, ordinalHtlc_1.checkHtlcStatus)(htlcRequest.contractAddress);
            if (onChainStatus.balance <= 0) {
                return res.status(400).json({ error: 'No funds to refund' });
            }
            if (htlcRequest.status === 'refunded') {
                return res.status(400).json({ error: 'HTLC has already been refunded' });
            }
            if (htlcRequest.status === 'redeemed') {
                return res.status(400).json({ error: 'HTLC has already been redeemed' });
            }
            // Get the refund private key from environment
            const refundPrivateKey = process.env.HTLC_REFUND_PRIVATE_KEY;
            if (!refundPrivateKey) {
                return res.status(500).json({ error: 'Refund private key not configured' });
            }
            // Execute the refund
            const txId = await (0, ordinalHtlc_1.executeHtlcRefund)(htlcRequest.redeemScript, htlcRequest.contractAddress, destinationAddress, refundPrivateKey);
            // Update HTLC status
            await htlcService.updateHtlcRequest(requestId, {
                status: 'refunded',
                refundTxId: txId
            });
            return res.status(200).json({
                requestId,
                status: 'refunded',
                txId,
                message: 'HTLC refund executed successfully'
            });
        }
        catch (error) {
            console.error('Error executing HTLC refund:', error);
            return res.status(500).json({ error: error.message });
        }
    });
    /**
     * Get all HTLC requests
     * GET /api/htlc/requests
     */
    app.get('/api/htlc/requests', async (req, res) => {
        try {
            // Get all HTLC requests
            const requests = await htlcService.getAllHtlcRequests();
            return res.status(200).json({
                count: requests.length,
                requests
            });
        }
        catch (error) {
            console.error('Error getting HTLC requests:', error);
            return res.status(500).json({ error: error.message });
        }
    });
    /**
     * Get current Bitcoin block height
     * GET /api/htlc/block-height
     */
    app.get('/api/htlc/block-height', async (req, res) => {
        try {
            const blockHeight = await (0, ordinalHtlc_1.getCurrentBlockHeight)();
            return res.status(200).json({
                blockHeight
            });
        }
        catch (error) {
            console.error('Error getting block height:', error);
            return res.status(500).json({ error: error.message });
        }
    });
}
