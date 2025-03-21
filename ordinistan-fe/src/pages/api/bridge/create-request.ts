import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const BRIDGE_LISTENER_URL = process.env.NEXT_PUBLIC_BRIDGE_LISTENER_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { inscriptionId, userEvmAddress } = req.body;

    if (!inscriptionId || !userEvmAddress) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create bridge request
    const response = await axios.post(`${BRIDGE_LISTENER_URL}/api/bridge-request`, {
      inscriptionId,
      userEvmAddress
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error creating bridge request:', error);
    return res.status(500).json({ 
      error: 'Failed to create bridge request',
      details: error.response?.data || error.message 
    });
  }
} 