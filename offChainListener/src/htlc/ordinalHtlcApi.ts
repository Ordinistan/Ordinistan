import express, { Request, Response, Application } from 'express';
import { createOrdinalHtlc, isValidBitcoinAddress } from './create-ordinal-htlc';
import { refundOrdinalHtlc } from './refund-ordinal-htlc';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

// Path for storing HTLC requests
const STORAGE_PATH = path.join(__dirname, '../../data/htlc-requests.json');

// Ensure the directory exists
const dirPath = path.dirname(STORAGE_PATH);
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Interface for HTLC request
interface HtlcRequest {
  id: string;
  timestamp: number;
  btcAddress: string;
  status: string;
  htlcAddress?: string;
  preimage?: string;
  contractHash?: string;
  witnessScript?: string;
  timelock?: number;
  timeDurationHours?: number;
  isOrdinal?: boolean;
  refundKeyDerivationPath?: string;
  error?: {
    message: string;
    details?: string;
  };
}

// Load existing HTLC requests or initialize empty array
let htlcRequests: HtlcRequest[] = [];
try {
  if (fs.existsSync(STORAGE_PATH)) {
    const data = fs.readFileSync(STORAGE_PATH, 'utf8');
    if (data && data.trim()) {
      htlcRequests = JSON.parse(data);
    } else {
      // Initialize with empty array if file is empty
      htlcRequests = [];
      // Save the empty array to the file
      fs.writeFileSync(STORAGE_PATH, JSON.stringify(htlcRequests, null, 2));
      console.log('Initialized empty HTLC requests file');
    }
  } else {
    // Create the file with an empty array if it doesn't exist
    fs.writeFileSync(STORAGE_PATH, JSON.stringify([], null, 2));
    console.log('Created new HTLC requests file');
  }
} catch (error) {
  console.error('Error loading HTLC requests:', error);
  // If there was an error parsing the file, initialize with empty array and save it
  htlcRequests = [];
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(htlcRequests, null, 2));
  console.log('Reset HTLC requests file due to parsing error');
}

// Save HTLC requests to file
function saveHtlcRequests(): void {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(htlcRequests, null, 2));
  } catch (error) {
    console.error('Error saving HTLC requests:', error);
  }
}

/**
 * Sets up the HTLC API routes
 * @param app Express application
 */
export function setupOrdinalHtlcApi(app: Application): void {
  // Endpoint to create a new HTLC for ordinals
  app.post('/api/htlc/create-ordinal-htlc', (req: Request, res: Response) => {
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

      if (!isValidBitcoinAddress(btcAddress)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid Bitcoin address',
            details: 'The provided Bitcoin address is not valid'
          }
        });
      }

      // Create a unique ID for this request
      const requestId = uuidv4();
      
      // Create new HTLC request entry
      const htlcRequest: HtlcRequest = {
        id: requestId,
        timestamp: Date.now(),
        btcAddress,
        status: 'pending'
      };

      try {
        // Create the HTLC
        const htlc = createOrdinalHtlc(btcAddress, timeDuration);
        
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
      } catch (error) {
        const err = error as Error;
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
    } catch (error) {
      const err = error as Error;
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
  app.get('/api/htlc/status/:requestId', (req: Request, res: Response) => {
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
    } catch (error) {
      const err = error as Error;
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
  app.post('/api/htlc/refund-ordinal-htlc', async (req: Request, res: Response) => {
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
        const refundTx = await refundOrdinalHtlc(btcAddress, htlcAddress);
        
        // Ensure refundTx is not empty
        if (!refundTx) {
          throw new Error('Refund transaction creation failed - empty response');
        }
        
        return res.status(200).json({
          success: true,
          message: 'Refund transaction created successfully',
          refundTx
        });
      } catch (error: any) {
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
    } catch (error: any) {
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
export default setupOrdinalHtlcApi; 