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
  
  // HTLC specific states
  const [activeTab, setActiveTab] = useState<'standard' | 'htlc'>('standard');
  const [htlcData, setHtlcData] = useState<any>(null);
  const [isCreatingHtlc, setIsCreatingHtlc] = useState(false);
  const [htlcStatus, setHtlcStatus] = useState<string>('');
  const [htlcError, setHtlcError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [canRefund, setCanRefund] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

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
          await BitcoinProofUtils.waitForConfirmationAndGetProof(state.txId);
          BridgeStateManager.updateBridgeStatus('completed');
          break;
        case 'generating_proof':
          setBridgeStatus('Generating proof...');
          await BitcoinProofUtils.waitForConfirmationAndGetProof(state.txId);
          BridgeStateManager.updateBridgeStatus('completed');
          break;
      }
      
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
      // Clean up the inscription ID to ensure only one i0 suffix
      const cleanInscriptionId = selectedOrdinal.slice(0, -2);
      
      // 1. Create bridge request first
      setBridgeStatus('Creating bridge request...');
      const bridgeResponse = await axios.post('/api/bridge/create-request', {
        inscriptionId: cleanInscriptionId,
        userEvmAddress: receiverAddress
      });

      if (!bridgeResponse.data || bridgeResponse.data.error) {
        throw new Error(bridgeResponse.data?.error || 'Failed to create bridge request');
      }

      // 2. Send ordinal to bridge address
      setBridgeStatus('Sending ordinal to bridge address...');
      
      console.log('cleanInscriptionId', cleanInscriptionId);
      console.log('BRIDGE_ADDRESS', BRIDGE_ADDRESS);
      const sendResponse = await request('ord_sendInscriptions', {
        transfers: [{
          inscriptionId: cleanInscriptionId,
          address: BRIDGE_ADDRESS
        }]
      }) as RpcResult<'ord_sendInscriptions'>;

      if (!sendResponse || sendResponse.status === 'error') {
        throw new Error('Failed to send ordinal');
      }

      console.log('sendResponse', sendResponse);

      const txId = sendResponse.result.txid;
      if (!txId) {
        throw new Error('No transaction ID received');
      }

      // Save bridge state
      BridgeStateManager.saveBridgeState({
        txId,
        inscriptionId: cleanInscriptionId,
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

      setBridgeStatus('Bridge request created successfully! Waiting for confirmation...');
      
      // Reset form after successful initiation
      setSelectedOrdinal('');
      setPreviewUrl('');
      setReceiverAddress('');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      BridgeStateManager.updateBridgeStatus('failed', errorMessage);
      setBridgeStatus(`Bridge failed: ${errorMessage}`);
    } finally {
      setIsBridging(false);
    }
  };

  // HTLC functions
  const createHtlc = async () => {
    if (!ordinalsAddress) return;
    
    setIsCreatingHtlc(true);
    setHtlcError(null);
    setHtlcData(null);

    try {
      // Create the HTLC with the selected address as recipient and refund
      const response = await axios.post('/api/htlc/create-ordinal-htlc', {
        recipientAddress: ordinalsAddress,
        refundAddress: ordinalsAddress // Same address for both recipient and refund
      });

      setHtlcData(response.data.htlcData);
      setRequestId(response.data.htlcData.id);
      setHtlcStatus('HTLC created successfully! Send your ordinal to the HTLC address shown below.');

      // Start polling for status
      const interval = setInterval(() => fetchHtlcStatus(response.data.htlcData.id), 10000);
      setRefreshInterval(interval);
    } catch (err: any) {
      console.error('HTLC creation error:', err);
      setHtlcError(err.response?.data?.error || err.message || 'Failed to create HTLC');
    } finally {
      setIsCreatingHtlc(false);
    }
  };

  const fetchHtlcStatus = async (id: string) => {
    try {
      const response = await axios.get(`/api/htlc/status/${id}`);
      
      if (response.data.canRefund) {
        setCanRefund(true);
      }
      
      // If the status is refunded, clear the interval
      if (response.data.status === 'refunded') {
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
        setHtlcStatus('The ordinal has been successfully refunded!');
      }
    } catch (error) {
      console.error('Error fetching HTLC status:', error);
    }
  };

  const executeRefund = async () => {
    if (!requestId || !ordinalsAddress) return;
    
    setIsRefunding(true);
    
    try {
      const response = await axios.post('/api/htlc/execute-refund', {
        requestId,
        destinationAddress: ordinalsAddress
      });
      
      setHtlcStatus(`Refund executed! Transaction ID: ${response.data.txid}`);
      
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    } catch (error: any) {
      setHtlcError(error.response?.data?.error || error.message || 'Failed to execute refund');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <>
      <Head>
        <title>Bridge - Ordinistan</title>
        <meta name="description" content="Bridge your Bitcoin Ordinals to Core Chain" />
      </Head>

      <section className="py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-core-primary to-core-secondary 
                         bg-clip-text text-transparent mb-4">
              Bridge Your Ordinals
            </h1>
            <p className="text-core-muted">Transfer your Bitcoin Ordinals to Core Chain seamlessly</p>
          </div>

          {/* Bridge Types Tab Selector */}
          <div className="flex mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('standard')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'standard'
                  ? 'text-core-primary border-b-2 border-core-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Standard Bridge
            </button>
            <button
              onClick={() => setActiveTab('htlc')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'htlc'
                  ? 'text-core-primary border-b-2 border-core-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              HTLC (Timelock)
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8
                        border border-white/50 shadow-lg">
            
            {activeTab === 'standard' ? (
              /* Standard Bridge Form */
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
            ) : (
              /* HTLC Bridge Form */
              <div className="space-y-6">
                {/* Explanation */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="font-medium text-core-dark mb-2">About Time-Locked Contracts</h3>
                  <p className="text-sm text-core-muted">
                    Hash Time-Locked Contracts (HTLC) allow you to lock your ordinals for a specific period. 
                    If you decide to cancel the bridge, you can automatically retrieve your ordinals 
                    after the timelock expires. This adds an extra layer of safety to the bridging process.
                  </p>
                </div>

                {/* Your Bitcoin Address */}
                <div>
                  <label className="block text-sm font-medium text-core-dark mb-2">Your Bitcoin Address</label>
                  <div className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50">
                    <p className="text-gray-900 font-mono text-sm break-all">
                      {ordinalsAddress || 'Connect wallet to view address'}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-core-muted">
                    This address will be used to receive your ordinal if you decide to execute a refund.
                  </p>
                </div>

                {/* HTLC Status */}
                {htlcData ? (
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <h3 className="font-medium text-core-dark mb-2">HTLC Details</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-core-muted">HTLC Address:</p>
                          <p className="text-gray-900 font-mono text-sm break-all">{htlcData.htlcAddress}</p>
                        </div>
                        <div>
                          <p className="text-sm text-core-muted">Timelock (Block Height):</p>
                          <p className="text-gray-900 font-mono">{htlcData.timelock}</p>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-core-muted font-medium">Instructions:</p>
                          <ol className="list-decimal list-inside text-sm text-core-muted mt-1 space-y-1">
                            <li>Send your ordinal to the HTLC address above</li>
                            <li>Wait for the transaction to confirm</li>
                            <li>If you decide to refund, wait until the timelock expires</li>
                            <li>Use the "Execute Refund" button to retrieve your ordinal</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    {/* Refund Button */}
                    {canRefund && (
                      <button
                        onClick={executeRefund}
                        disabled={isRefunding}
                        className={`w-full py-4 bg-red-500 text-white rounded-xl font-medium transition-all
                                 ${isRefunding ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
                      >
                        {isRefunding ? 'Processing Refund...' : 'Execute Refund'}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={createHtlc}
                    disabled={!isConnected || isCreatingHtlc}
                    className={`w-full py-4 bg-gradient-to-r from-core-primary to-core-secondary 
                             text-white rounded-xl font-medium transition-all
                             ${(!isConnected || isCreatingHtlc)
                               ? 'opacity-50 cursor-not-allowed' 
                               : 'hover:shadow-lg hover:shadow-core-primary/25'}`}
                  >
                    {!isConnected
                      ? 'Connect Wallet to Create HTLC'
                      : isCreatingHtlc
                        ? 'Creating HTLC...'
                        : 'Create HTLC (Timelock)'}
                  </button>
                )}

                {/* HTLC Status Message */}
                {htlcStatus && (
                  <div className="text-sm text-center text-green-500">
                    {htlcStatus}
                  </div>
                )}

                {/* HTLC Error Message */}
                {htlcError && (
                  <div className="text-sm text-center text-red-500">
                    {htlcError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Bridge; 