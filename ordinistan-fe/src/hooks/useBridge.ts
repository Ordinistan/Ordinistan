import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';

interface BridgeRequest {
  inscriptionId: string;
  userEvmAddress: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  tokenId?: string;
  lastChecked?: number;
  retryCount?: number;
}

export function useBridge() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeRequest | null>(null);

  const createBridgeRequest = useCallback(async (inscriptionId: string) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/bridge/create-request', {
        inscriptionId,
        userEvmAddress: address
      });

      setBridgeStatus({
        inscriptionId,
        userEvmAddress: address,
        status: 'pending',
        timestamp: Date.now()
      });

      return response.data.bridgeAddress;
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create bridge request');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const checkBridgeStatus = useCallback(async (inscriptionId: string) => {
    try {
      const response = await axios.get(`/api/bridge/create-request?inscriptionId=${inscriptionId}`);
      setBridgeStatus(response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error checking bridge status:', error);
      return null;
    }
  }, []);

  return {
    createBridgeRequest,
    checkBridgeStatus,
    isLoading,
    error,
    bridgeStatus
  };
} 