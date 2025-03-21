import BridgeListener from './bridgeListener';

async function main() {
  let listener: BridgeListener | null = null;
  
  try {
    // Create the bridge listener instance
    listener = await BridgeListener.create();
    console.log('Bridge Listener started successfully');
    
    // Handle process termination
    process.on('SIGINT', async () => {
      console.log('Received SIGINT. Cleaning up...');
      if (listener) {
        listener.stopMonitoring();
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM. Cleaning up...');
      if (listener) {
        listener.stopMonitoring();
      }
      process.exit(0);
    });

    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('Error in main:', error);
    if (listener) {
      listener.stopMonitoring();
    }
    process.exit(1);
  }
}

main(); 