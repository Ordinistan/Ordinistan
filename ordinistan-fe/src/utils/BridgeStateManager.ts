interface BridgeState {
  txId: string;
  inscriptionId: string;
  fromAddress: string;
  toAddress: string;
  receiverAddress: string;
  status: 'pending_confirmation' | 'generating_proof' | 'submitting_to_light_client' | 'completed' | 'failed';
  timestamp: number;
  error?: string;
  metadata?: {
    inscriptionNumber: string;
    contentType: string;
    timestamp: number;
  };
}

export class BridgeStateManager {
  private static readonly STORAGE_KEY = 'BRIDGE_STATE';
  private static readonly EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days

  static saveBridgeState(state: Omit<BridgeState, 'timestamp'>): void {
    const fullState: BridgeState = {
      ...state,
      timestamp: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fullState));
  }

  static getBridgeState(): BridgeState | null {
    const stateStr = localStorage.getItem(this.STORAGE_KEY);
    if (!stateStr) return null;

    const state: BridgeState = JSON.parse(stateStr);
    
    // Clear expired states
    if (Date.now() - state.timestamp > this.EXPIRY_TIME) {
      this.clearBridgeState();
      return null;
    }

    return state;
  }

  static clearBridgeState(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static updateBridgeStatus(status: BridgeState['status'], error?: string): void {
    const state = this.getBridgeState();
    if (!state) return;

    this.saveBridgeState({
      ...state,
      status,
      error
    });
  }
} 