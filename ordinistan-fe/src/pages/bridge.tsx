import type { NextPage } from 'next';
import Head from 'next/head';
import { FiArrowRight } from 'react-icons/fi';
import { useBitcoinWallet } from '../utils/BitcoinWalletContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { request, RpcResult } from 'sats-connect';
import axios from 'axios';
import { ethers } from 'ethers';

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
  const [htlcData, setHtlcData] = useState<any>(null);
  const [isCreatingHtlc, setIsCreatingHtlc] = useState(false);
  const [htlcStatus, setHtlcStatus] = useState<string>('');
  const [htlcError, setHtlcError] = useState<string | null>(null);

  // Memoize the getPreviewUrl function
  const getPreviewUrl = useCallback((inscriptionId: string) => {
    const id = inscriptionId.replace('i0', '');
    return `https://api.hiro.so/ordinals/v1/inscriptions/${id}/content`;
  }, []);

  // Add a safe image URL function that falls back to our Free Fire image
  const getSafeImageUrl = useCallback((url: string) => {
    if (!url) return "https://photosbook.in/wp-content/uploads/free-fire-photo-dp1.jpg";
    return url.includes('https://api.hiro.so/ordinals/v1/inscriptions/e361e0aa7cb0ci0/content') 
      ? "https://photosbook.in/wp-content/uploads/free-fire-photo-dp1.jpg" 
      : url;
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
  }, [isConnected, ordinalsAddress]);

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
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://photosbook.in/wp-content/uploads/free-fire-photo-dp1.jpg";
            }}
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

  // Function to create HTLC
  const createHtlc = async () => {
    if (!ordinalsAddress || !receiverAddress) return;
    
    if (!validateEvmAddress(receiverAddress)) {
      setReceiverError('Invalid EVM address');
      return;
    }
    
    setIsCreatingHtlc(true);
    setHtlcError(null);
    setHtlcData(null);
    setHtlcStatus('Generating HTLC address...');

    try {
      // Create the HTLC with the correct parameters
      const response = await axios.post('/api/htlc/create-ordinal-htlc', {
        recipientAddress: ordinalsAddress,
        refundAddress: ordinalsAddress,
        btcAddress: ordinalsAddress, // The BTC address parameter expected by the backend
        userEvmAddress: receiverAddress // This will be used for minting the NFT
      });

      // Store the response data
      const htlcResponseData = response.data;
      console.log("HTLC created successfully:", htlcResponseData);
      
      setHtlcData(htlcResponseData);
      setHtlcStatus('HTLC address generated successfully! You can now bridge your ordinal.');
    } catch (err: any) {
      console.error('HTLC creation error:', err);
      setHtlcError(err.response?.data?.error || err.message || 'Failed to create HTLC');
    } finally {
      setIsCreatingHtlc(false);
    }
  };

  const handleBridge = async () => {
    if (!selectedOrdinal || !selectedOrdinalData || !ordinalsAddress || !htlcData) return;
    
    // Get the HTLC address from the response data
    const htlcAddress = htlcData.htlcAddress || htlcData.htlcData?.htlcAddress;
    
    if (!htlcAddress) {
      setBridgeStatus('Error: HTLC address not found in response data');
      return;
    }
    
    setIsBridging(true);
    setBridgeStatus('Initiating bridge process...');
    
    try {
      // Clean up the inscription ID to ensure only one i0 suffix
      const cleanInscriptionId = selectedOrdinal.slice(0, -2);
      
      // Send ordinal to HTLC address
      setBridgeStatus('Sending ordinal to bridge HTLC address...');
      
      console.log('cleanInscriptionId', cleanInscriptionId);
      console.log('HTLC Address', htlcAddress);
      const sendResponse = await request('ord_sendInscriptions', {
        transfers: [{
          inscriptionId: cleanInscriptionId,
          address: htlcAddress
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

      setBridgeStatus('Bridge transaction sent successfully! Your NFT will be minted once the transaction is confirmed.');
      
      // Reset form after successful initiation
      setSelectedOrdinal('');
      setPreviewUrl('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
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

      <section className="py-28 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-core-primary to-core-secondary 
                         bg-clip-text text-transparent mb-4">
              Bridge Your Ordinals
            </h1>
            <p className="text-core-muted">Transfer your Bitcoin Ordinals to Core Chain using HTLC</p>
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

              {/* Receiver Address (EVM) */}
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
                  disabled={isBridging || !!htlcData}
                />
                {receiverError && (
                  <p className="mt-1 text-sm text-red-500">{receiverError}</p>
                )}
              </div>

              {/* Generate HTLC Button */}
              {!htlcData && (
                <button
                  onClick={createHtlc}
                  disabled={!isConnected || isCreatingHtlc || !receiverAddress || !!receiverError}
                  className={`w-full py-4 bg-gradient-to-r from-core-primary to-core-secondary 
                           text-white rounded-xl font-medium transition-all
                           ${(!isConnected || isCreatingHtlc || !receiverAddress || !!receiverError)
                             ? 'opacity-50 cursor-not-allowed' 
                             : 'hover:shadow-lg hover:shadow-core-primary/25'}`}
                >
                  {!isConnected
                    ? 'Connect Wallet to Continue'
                    : isCreatingHtlc
                      ? 'Generating HTLC Address...'
                      : 'Generate HTLC Address'}
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

              {/* HTLC Address Details */}
              {htlcData && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-medium text-core-dark mb-2">HTLC Address</h3>
                  <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 mb-4">
                    <p className="text-gray-900 font-mono text-sm break-all">
                      {htlcData.htlcAddress || htlcData.htlcData?.htlcAddress || 'Address not found in response'}
                    </p>
                  </div>
                  
                  {/* Asset Selection */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-core-dark mb-2">Select Ordinal to Bridge</label>
                    {!isConnected ? (
                      <div className="border border-gray-200 rounded-xl p-4">
                        <p className="text-core-muted text-center">Connect wallet to view your Ordinals</p>
                      </div>
                    ) : isFetching ? (
                      <div className="border border-gray-200 rounded-xl p-4">
                        <div className="flex flex-col items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-2"></div>
                          <p className="text-core-muted text-center">Loading ordinals...</p>
                          <p className="text-xs text-gray-500 mt-2">This may take a moment</p>
                        </div>
                      </div>
                    ) : ordinals.length === 0 ? (
                      <div className="border border-gray-200 rounded-xl p-4">
                        <p className="text-core-muted text-center">No ordinals found in your wallet</p>
                        <div className="mt-3 flex justify-center">
                          <button
                            onClick={() => {
                              console.log("Manually triggering inscription fetch");
                              setIsFetching(true);
                              fetchInscriptions()
                                .then(() => console.log("Manual fetch completed"))
                                .catch(err => console.error("Manual fetch error:", err))
                                .finally(() => setIsFetching(false));
                            }}
                            className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 text-sm hover:bg-gray-300"
                          >
                            Retry Loading
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative">
                          {/* Custom Dropdown Button */}
                          <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full p-3 rounded-xl border border-gray-200 focus:border-core-primary 
                                    outline-none bg-white text-left flex items-center justify-between"
                            disabled={isBridging}
                          >
                            {selectedOrdinalData ? (
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100">
                                  <img
                                    src={getSafeImageUrl(previewUrl)}
                                    alt="Selected Ordinal"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = "https://photosbook.in/wp-content/uploads/free-fire-photo-dp1.jpg";
                                    }}
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
                                    src={getSafeImageUrl(previewUrl)}
                                    alt="Ordinal Preview"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = "https://photosbook.in/wp-content/uploads/free-fire-photo-dp1.jpg";
                                    }}
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

                  {/* Bridge Button */}
                  <button 
                    disabled={!isConnected || !selectedOrdinal || isBridging}
                    onClick={handleBridge}
                    className={`w-full py-4 mt-6 bg-gradient-to-r from-core-primary to-core-secondary 
                              text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2
                              ${(!isConnected || !selectedOrdinal || isBridging)
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:shadow-lg hover:shadow-core-primary/25'}`}
                  >
                    {!isConnected 
                      ? 'Connect Wallet to Bridge' 
                      : !selectedOrdinal 
                        ? 'Select an Ordinal'
                        : isBridging
                          ? 'Bridging...'
                          : 'Send to HTLC Address'}
                    {!isBridging && <FiArrowRight className="group-hover:translate-x-1 transition-transform" />}
                  </button>

                  {/* Bridge Status */}
                  {bridgeStatus && (
                    <div className={`mt-4 text-sm text-center ${
                      bridgeStatus.includes('failed') ? 'text-red-500' : 
                      bridgeStatus.includes('successfully') ? 'text-green-500' : 
                      'text-core-muted'
                    }`}>
                      {bridgeStatus}
                    </div>
                  )}
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