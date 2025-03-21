import BridgeListener from './bridgeListener';

async function main() {
  try {
    // Initialize the bridge listener
    const listener = await BridgeListener.create();
    
    // Example: Create a bridge request
    await listener.createBridgeRequest(
      'abcdef1234567890i0', // Example inscription ID
      '0x1234567890123456789012345678901234567890' // Example EVM address
    );
    
    // Get all pending requests
    const pendingRequests = listener.getBridgeRequests('pending');
    console.log('Pending requests:', pendingRequests);
    
    // The listener will continue running and checking for transfers
    // You can stop it with:
    // listener.stopMonitoring();
  } catch (error) {
    console.error('Error in main:', error);
  }
}

main(); 