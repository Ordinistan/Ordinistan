import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId } = req.query;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing required parameter: requestId' });
    }

    // Check if BRIDGE_SERVICE_URL environment variable is set
    const bridgeServiceUrl = process.env.BRIDGE_SERVICE_URL;
    if (!bridgeServiceUrl) {
      console.error('BRIDGE_SERVICE_URL environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error: BRIDGE_SERVICE_URL is not set' });
    }

    // Forward request to the backend service
    try {
      console.log(`Forwarding request to ${bridgeServiceUrl}/api/htlc/status/${requestId}`);
      
      const response = await axios.get(`${bridgeServiceUrl}/api/htlc/status/${requestId}`);
      return res.status(200).json(response.data);
    } catch (error: any) {
      console.error('Error from backend service:', error);
      
      // Enhanced error handling with more specific messages
      if (error.code === 'ECONNREFUSED') {
        return res.status(500).json({ 
          error: 'Could not connect to the bridge service. Make sure the service is running on port 3003.',
          details: `Connection refused to ${bridgeServiceUrl}. Please verify your .env configuration and ensure the service is running.`
        });
      }
      
      if (error.code === 'ERR_INVALID_URL') {
        return res.status(500).json({ 
          error: 'Invalid backend service URL',
          details: `The configured URL "${bridgeServiceUrl}" is invalid. Please check BRIDGE_SERVICE_URL in your .env file.`
        });
      }
      
      // Return error from backend if available, or fallback to a generic message
      return res.status(error.response?.status || 500).json({ 
        error: 'Failed to get HTLC status',
        details: error.response?.data?.details || error.response?.data?.error || error.message 
      });
    }
  } catch (error: any) {
    console.error('Error processing HTLC status request:', error);
    return res.status(500).json({ 
      error: 'Failed to process HTLC status request',
      details: error.message 
    });
  }
} 