import type { NextPage } from 'next';
import Head from 'next/head';
import { FiArrowRight } from 'react-icons/fi';
import { useBitcoinWallet } from '../utils/BitcoinWalletContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { BitcoinProofUtils, TransactionProof } from '../utils/BitcoinProofUtils';
import { request, RpcResult } from 'sats-connect';
import { BridgeStateManager } from '../utils/BridgeStateManager';
import axios from 'axios';
import { ethers } from 'ethers';

const BRIDGE_ADDRESS = 'bc1pmgv3st9cr2lk8mthty73lct3dkntec2p60s587keeaafm8la6u6qv9nrnk';

const Bridge: NextPage = () => {
  const { isConnected, ordinals, fetchInscriptions, ordinalsAddress } = useBitcoinWallet();
  const [selectedOrdinal, setSelectedOrdinal] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<string>('');
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [receiverError, setReceiverError] = useState<string>('');

  // Memoize the getPreviewUrl function
  const getPreviewUrl = useCallback((inscriptionId: string) => {
    const id = inscriptionId.replace('i0', '');
    return `https://api.hiro.so/ordinals/v1/inscriptions/${id}/content`;
  }, []);

  // Fetch inscriptions only once when wallet connects
  useEffect(() => {
    const fetchData = async () => {
      if (isConnected && !isFetching && ordinalsAddress) {
        setIsFetching(true);
        try {
          await fetchInscriptions();
        } finally {
          setIsFetching(false);
        }
      }
    };

    fetchData();
  }, [isConnected, ordinalsAddress]); // Remove fetchInscriptions from dependencies

  // Memoize selected ordinal data
  const selectedOrdinalData = useMemo(() => {
    if (!selectedOrdinal) return null;
    return ordinals.find(o => o.inscriptionId === selectedOrdinal);
  }, [selectedOrdinal, ordinals]);

  // Update preview when ordinal is selected
  const handleOrdinalSelect = useCallback((inscriptionId: string) => {
    setSelectedOrdinal(inscriptionId);
    setPreviewUrl(getPreviewUrl(inscriptionId));
    setIsDropdownOpen(false);
  }, [getPreviewUrl]);

  // Memoize the dropdown items to prevent re-renders
  const dropdownItems = useMemo(() => {
    return ordinals.map((ordinal) => (
      <button
        key={ordinal.inscriptionId}
        onClick={() => handleOrdinalSelect(ordinal.inscriptionId)}
        className="w-full p-3 hover:bg-gray-50 flex items-center space-x-3 border-b 
                 border-gray-100 last:border-0"
      >
        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
          <img
            src={getPreviewUrl(ordinal.inscriptionId)}
            alt={`Ordinal #${ordinal.inscriptionNumber}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">
            #{ordinal.inscriptionNumber}
          </div>
          <div className="text-sm text-gray-500">
            {ordinal.contentType}
            {ordinal.collectionName && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">
                {ordinal.collectionName}
              </span>
            )}
          </div>
        </div>
      </button>
    ));
  }, [ordinals, getPreviewUrl, handleOrdinalSelect]);

  // Submit proof to Light Client
  const submitToLightClient = async (proof: TransactionProof) => {
    // TODO: Implement Light Client contract call
    // This will be implemented once we have the Light Client interface
    throw new Error('Light Client submission not yet implemented');
  };

  // Check for existing bridge state on mount
  useEffect(() => {
    const existingState = BridgeStateManager.getBridgeState();
    if (existingState && existingState.status !== 'completed' && existingState.status !== 'failed') {
      setBridgeStatus('Resuming previous bridge...');
      resumeBridgeProcess(existingState);
    }
  }, []);

  const resumeBridgeProcess = async (state: any) => {
    setIsBridging(true);
    try {
      switch (state.status) {
        case 'pending_confirmation':
          setBridgeStatus('Waiting for Bitcoin confirmation...');
          const proof = await BitcoinProofUtils.waitForConfirmationAndGetProof(state.txId);
          BridgeStateManager.updateBridgeStatus('generating_proof');
          await submitToLightClient(proof);
          break;
        case 'generating_proof':
          setBridgeStatus('Generating proof...');
          const resumeProof = await BitcoinProofUtils.waitForConfirmationAndGetProof(state.txId);
          await submitToLightClient(resumeProof);
          break;
        // Add more cases as needed
      }
      
      BridgeStateManager.updateBridgeStatus('completed');
      setBridgeStatus('Bridge process completed successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      BridgeStateManager.updateBridgeStatus('failed', errorMessage);
      setBridgeStatus(`Bridge failed: ${errorMessage}`);
    } finally {
      setIsBridging(false);
    }
  };

  const validateEvmAddress = (address: string): boolean => {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  };

  const handleReceiverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setReceiverAddress(address);
    
    if (!address) {
      setReceiverError('Receiver address is required');
    } else if (!validateEvmAddress(address)) {
      setReceiverError('Invalid EVM address');
    } else {
      setReceiverError('');
    }
  };

  const handleBridge = async () => {
    if (!selectedOrdinal || !selectedOrdinalData || !ordinalsAddress || !receiverAddress) return;
    
    if (!validateEvmAddress(receiverAddress)) {
      setReceiverError('Invalid EVM address');
      return;
    }
    
    setIsBridging(true);
    setBridgeStatus('Initiating bridge process...');
    
    try {
      // 1. Send ordinal to bridge address
      setBridgeStatus('Sending ordinal to bridge address...');
      
      const sendResponse = await request('ord_sendInscriptions', {
        transfers: [{
          inscriptionId: selectedOrdinal,
          address: BRIDGE_ADDRESS
        }]
      }) as RpcResult<'ord_sendInscriptions'>;

      if (!sendResponse || sendResponse.status === 'error') {
        throw new Error('Failed to send ordinal');
      }

      const txId = sendResponse.result.txid;
      if (!txId) {
        throw new Error('No transaction ID received');
      }

      // Save initial bridge state with receiver address
      BridgeStateManager.saveBridgeState({
        txId,
        inscriptionId: selectedOrdinal,
        fromAddress: ordinalsAddress,
        toAddress: BRIDGE_ADDRESS,
        receiverAddress,
        status: 'pending_confirmation',
        metadata: {
          inscriptionNumber: selectedOrdinalData.inscriptionNumber,
          contentType: selectedOrdinalData.contentType,
          timestamp: Date.now()
        }
      });

      // 2. Send to server for processing
      setBridgeStatus('Processing bridge transaction...');
      const response = await axios.post('/api/bridge/initiate', {
        txId,
        inscriptionId: selectedOrdinal,
        fromAddress: ordinalsAddress,
        receiverAddress,
        metadata: {
          inscriptionNumber: selectedOrdinalData.inscriptionNumber,
          contentType: selectedOrdinalData.contentType
        }
      });

      if (response.data.status === 'completed') {
        BridgeStateManager.updateBridgeStatus('completed');
        setBridgeStatus('Bridge process completed successfully!');
        // Clear the bridge state from localStorage after successful completion
        BridgeStateManager.clearBridgeState();
        // Reset form
        setSelectedOrdinal('');
        setPreviewUrl('');
        setReceiverAddress('');
      } else {
        throw new Error(response.data.error || 'Bridge process failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      BridgeStateManager.updateBridgeStatus('failed', errorMessage);
      setBridgeStatus(`Bridge failed: ${errorMessage}`);
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <>
      <Head>
        <title>Bridge - Ordinistan</title>
        <meta name="description" content="Bridge your Bitcoin Ordinals to Core Chain" />
      </Head>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-core-primary to-core-secondary 
                         bg-clip-text text-transparent mb-4">
              Bridge Your Ordinals
            </h1>
            <p className="text-core-muted">Transfer your Bitcoin Ordinals to Core Chain seamlessly</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8
                         border border-white/50 shadow-lg">
            <div className="space-y-6">
              {/* From Address */}
              <div>
                <label className="block text-sm font-medium text-core-dark mb-2">From Address</label>
                <div className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <p className="text-gray-900 font-mono text-sm break-all">
                    {ordinalsAddress || 'Connect wallet to view address'}
                  </p>
                </div>
              </div>

              {/* To Address */}
              <div>
                <label className="block text-sm font-medium text-core-dark mb-2">Bridge Address</label>
                <div className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50">
                  <p className="text-gray-900 font-mono text-sm break-all">
                    {BRIDGE_ADDRESS}
                  </p>
                </div>
              </div>

              {/* Receiver Address */}
              <div>
                <label className="block text-sm font-medium text-core-dark mb-2">
                  Receiver Address (Core Chain)
                </label>
                <input
                  type="text"
                  value={receiverAddress}
                  onChange={handleReceiverChange}
                  placeholder="Enter Core Chain address (0x...)"
                  className={`w-full p-3 rounded-xl border ${
                    receiverError 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-200 focus:border-core-primary'
                  } bg-white text-gray-900 outline-none transition-colors`}
                  disabled={isBridging}
                />
                {receiverError && (
                  <p className="mt-1 text-sm text-red-500">{receiverError}</p>
                )}
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-sm font-medium text-core-dark mb-2">Select Ordinal</label>
                {!isConnected ? (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <p className="text-core-muted text-center">Connect wallet to view your Ordinals</p>
                  </div>
                ) : isFetching ? (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <p className="text-core-muted text-center">Loading ordinals...</p>
                  </div>
                ) : ordinals.length === 0 ? (
                  <div className="border border-gray-200 rounded-xl p-4">
                    <p className="text-core-muted text-center">No ordinals found in your wallet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      {/* Custom Dropdown Button */}
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-core-primary 
                                 outline-none bg-white text-left flex items-center justify-between"
                      >
                        {selectedOrdinalData ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100">
                              <img
                                src={previewUrl}
                                alt="Selected Ordinal"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-gray-900">
                              #{selectedOrdinalData.inscriptionNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Select an ordinal</span>
                        )}
                        <svg className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown List */}
                      {isDropdownOpen && (
                        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl 
                                      shadow-lg max-h-96 overflow-y-auto">
                          {dropdownItems}
                        </div>
                      )}
                    </div>

                    {/* Preview Section */}
                    {selectedOrdinal && selectedOrdinalData && (
                      <div className="mt-4 border border-gray-200 rounded-xl p-4">
                        <h3 className="text-sm font-medium text-core-dark mb-2">Preview</h3>
                        <div className="aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-100">
                          {previewUrl && (
                            selectedOrdinalData.contentType.startsWith('image/') ? (
                              <img
                                src={previewUrl}
                                alt="Ordinal Preview"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-core-muted">
                                {selectedOrdinalData.contentType}
                              </div>
                            )
                          )}
                        </div>
                        <div className="mt-2 text-sm text-core-muted text-center">
                          <a 
                            href={selectedOrdinalData.explorer}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-core-primary hover:text-core-secondary"
                          >
                            View on Explorer
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button 
                disabled={!isConnected || !selectedOrdinal || !receiverAddress || !!receiverError || isBridging}
                onClick={handleBridge}
                className={`w-full py-4 bg-gradient-to-r from-core-primary to-core-secondary 
                           text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2
                           ${(!isConnected || !selectedOrdinal || !receiverAddress || !!receiverError || isBridging)
                             ? 'opacity-50 cursor-not-allowed' 
                             : 'hover:shadow-lg hover:shadow-core-primary/25'}`}
              >
                {!isConnected 
                  ? 'Connect Wallet to Bridge' 
                  : !selectedOrdinal 
                    ? 'Select an Ordinal'
                    : !receiverAddress || !!receiverError
                      ? 'Enter Valid Receiver Address'
                      : isBridging
                        ? 'Bridging...'
                        : 'Start Bridge'}
                {!isBridging && <FiArrowRight className="group-hover:translate-x-1 transition-transform" />}
              </button>

              {/* Bridge Status */}
              {bridgeStatus && (
                <div className={`text-sm text-center ${
                  bridgeStatus.includes('failed') ? 'text-red-500' : 
                  bridgeStatus.includes('completed') ? 'text-green-500' : 
                  'text-core-muted'
                }`}>
                  {bridgeStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Bridge; 