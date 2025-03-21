import express from 'express';
import cors from 'cors';
import BridgeListener from './bridgeListener';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

let bridgeListener: BridgeListener | null = null;

// Initialize bridge listener
async function initializeBridgeListener() {
  try {
    bridgeListener = await BridgeListener.create();
    console.log('Bridge Listener initialized successfully');
  } catch (error) {
    console.error('Failed to initialize bridge listener:', error);
    process.exit(1);
  }
}

// API Routes
app.post('/api/bridge-request', async (req, res) => {
  try {
    if (!bridgeListener) {
      return res.status(503).json({ error: 'Bridge listener not initialized' });
    }

    const { inscriptionId, userEvmAddress } = req.body;

    if (!inscriptionId || !userEvmAddress) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    await bridgeListener.createBridgeRequest(inscriptionId, userEvmAddress);
    
    res.status(200).json({ 
      message: 'Bridge request created successfully',
      bridgeAddress: bridgeListener['BRIDGE_BTC_ADDRESS']
    });
  } catch (error: any) {
    console.error('Error creating bridge request:', error);
    res.status(500).json({ 
      error: 'Failed to create bridge request',
      details: error.message 
    });
  }
});

app.get('/api/bridge-request/:inscriptionId', async (req, res) => {
  try {
    if (!bridgeListener) {
      return res.status(503).json({ error: 'Bridge listener not initialized' });
    }

    const { inscriptionId } = req.params;
    const requests = bridgeListener.getBridgeRequests();
    const request = requests.find(r => r.inscriptionId === inscriptionId);

    if (!request) {
      return res.status(404).json({ error: 'Bridge request not found' });
    }

    res.status(200).json(request);
  } catch (error: any) {
    console.error('Error fetching bridge request:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bridge request',
      details: error.message 
    });
  }
});

// Start server
async function startServer() {
  await initializeBridgeListener();
  
  app.listen(port, () => {
    console.log(`Bridge Listener API running on port ${port}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    if (bridgeListener) {
      bridgeListener.stopMonitoring();
    }
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    if (bridgeListener) {
      bridgeListener.stopMonitoring();
    }
    process.exit(0);
  });
}

startServer(); 