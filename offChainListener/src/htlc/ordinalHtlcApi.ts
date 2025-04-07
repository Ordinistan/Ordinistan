import express, { Request, Response, Application } from 'express';
import { createOrdinalHtlc, isValidBitcoinAddress } from './create-ordinal-htlc';
import { refundOrdinalHtlc } from './refund-ordinal-htlc';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import * as cron from 'node-cron';

// Path for storing HTLC requests
const STORAGE_PATH = path.join(__dirname, '../../data/htlc-requests.json');

// Base URL for Hiro API
const HIRO_API_BASE = 'https://api.hiro.so/ordinals/v1';

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
  userEvmAddress?: string; // Add EVM address for NFT minting
  inscriptionId?: string;  // Add inscription ID when detected
  tokenId?: string;        // Add token ID when minted
  error?: {
    message: string;
    details?: string;
  };
  lastChecked?: number;
  retryCount?: number;
}

// Interface for Inscription response
interface InscriptionResponse {
  id: string;
  number: number;
  address: string; // Current owner's address
  content_type: string;
  content_length: number;
  sat_ordinal: number;
  sat_rarity: string;
  timestamp: number;
}

// Cron job for monitoring HTLC addresses
let htlcMonitoringJob: cron.ScheduledTask | null = null;
let isMonitoring = false;

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

// Function to check if an address owns any inscriptions
async function getAddressInscriptions(address: string): Promise<string[]> {
  try {
    const response = await axios.get(`${HIRO_API_BASE}/inscriptions`, {
      params: {
        address,
        limit: 20
      }
    });
    
    if (response.data && response.data.results) {
      return response.data.results.map((inscription: any) => inscription.id);
    }
    return [];
  } catch (error) {
    console.error(`Error fetching inscriptions for address ${address}:`, error);
    return [];
  }
}

// Function to get inscription details
async function getInscriptionDetails(inscriptionId: string): Promise<InscriptionResponse | null> {
  try {
    const response = await axios.get<InscriptionResponse>(
      `${HIRO_API_BASE}/inscriptions/${inscriptionId}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching inscription ${inscriptionId}:`, error);
    return null;
  }
}

// Function to mint an NFT from the inscription
async function mintNftFromInscription(request: HtlcRequest, inscriptionId: string): Promise<boolean> {
  try {
    if (!request.userEvmAddress) {
      console.error('No EVM address found for request');
      return false;
    }

    // Get inscription details
    const inscription = await getInscriptionDetails(inscriptionId);
    if (!inscription) {
      console.error(`Failed to get details for inscription ${inscriptionId}`);
      return false;
    }

    // Calculate token ID from inscription ID
    const cleanId = inscriptionId.endsWith('i0') ? inscriptionId.slice(0, -2) : inscriptionId;
    const bigInt = BigInt('0x' + cleanId);
    const tokenId = (bigInt % BigInt('10000000000000000')).toString();

    // Call the bridge service to mint the NFT
    const bridgeServiceUrl = process.env.BRIDGE_SERVICE_URL || 'http://localhost:3003';
    
    console.log(`Minting NFT for HTLC request ${request.id} with inscription ${inscriptionId}`);
    console.log(`Token ID: ${tokenId}, EVM Address: ${request.userEvmAddress}`);
    
    // Create a bridge request
    const bridgeResponse = await axios.post(`${bridgeServiceUrl}/api/bridge/create-request`, {
      inscriptionId,
      userEvmAddress: request.userEvmAddress
    });

    if (bridgeResponse.data.success) {
      console.log(`Successfully created bridge request for inscription ${inscriptionId}`);
      
      // Store the inscription and token info in the HTLC request
      request.inscriptionId = inscriptionId;
      request.tokenId = tokenId;
      request.status = 'bridged';
      saveHtlcRequests();
      
      return true;
    } else {
      console.error(`Failed to mint NFT for inscription ${inscriptionId}:`, bridgeResponse.data.error);
      return false;
    }
  } catch (error) {
    console.error(`Error minting NFT from inscription ${inscriptionId}:`, error);
    return false;
  }
}

// Function to start monitoring HTLC addresses
function startHtlcMonitoring(): void {
  if (htlcMonitoringJob) {
    htlcMonitoringJob.stop();
  }

  htlcMonitoringJob = cron.schedule('*/1 * * * *', async () => {
    if (isMonitoring) return;
    
    isMonitoring = true;
    try {
      console.log('Checking HTLC addresses for ordinals...');
      
      // Loop through all created HTLC requests that haven't been processed yet
      for (const request of htlcRequests) {
        // Only check 'created' requests
        if (request.status !== 'created' || !request.htlcAddress) continue;
        
        request.lastChecked = Date.now();
        
        try {
          // Check if the HTLC address has any inscriptions
          const inscriptions = await getAddressInscriptions(request.htlcAddress);
          
          if (inscriptions.length > 0) {
            console.log(`Found ${inscriptions.length} inscriptions at HTLC address ${request.htlcAddress}`);
            
            // Take the first inscription and mint it
            const inscriptionId = inscriptions[0];
            const success = await mintNftFromInscription(request, inscriptionId);
            
            if (success) {
              console.log(`Successfully processed HTLC request ${request.id}`);
            } else {
              // Increment retry count if failed
              request.retryCount = (request.retryCount || 0) + 1;
              if (request.retryCount >= 5) {
                request.status = 'failed';
                request.error = {
                  message: 'Failed to mint NFT after multiple attempts'
                };
              }
            }
          } else {
            console.log(`No inscriptions found at HTLC address ${request.htlcAddress}`);
          }
        } catch (error) {
          console.error(`Error processing HTLC request ${request.id}:`, error);
          
          // Update retry count and potentially mark as failed
          request.retryCount = (request.retryCount || 0) + 1;
          if (request.retryCount >= 5) {
            request.status = 'failed';
            request.error = {
              message: 'Failed to check HTLC address after multiple attempts'
            };
          }
        }
      }
      
      // Save any changes
      saveHtlcRequests();
      
    } catch (error) {
      console.error('Error during HTLC monitoring:', error);
    } finally {
      isMonitoring = false;
    }
  });

  console.log('HTLC address monitoring started');
}

/**
 * Sets up the HTLC API routes
 * @param app Express application
 */
export function setupOrdinalHtlcApi(app: Application): void {
  // Start HTLC monitoring when the API is set up
  startHtlcMonitoring();

  // Endpoint to create a new HTLC for ordinals
  app.post('/api/htlc/create-ordinal-htlc', (req: Request, res: Response) => {
    try {
      const { btcAddress, timeDuration, userEvmAddress } = req.body;

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
        status: 'pending',
        userEvmAddress // Store the EVM address for later use
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
          htlcData: {
            ...htlc,
            userEvmAddress // Include the EVM address in the response
          }
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