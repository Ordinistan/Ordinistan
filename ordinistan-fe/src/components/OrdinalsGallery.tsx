import React, { useEffect } from 'react';
import { useBitcoinWallet } from '../utils/BitcoinWalletContext';

const OrdinalsGallery: React.FC = () => {
  const { ordinals, isConnected, fetchInscriptions } = useBitcoinWallet();

  useEffect(() => {
    if (isConnected) {
      fetchInscriptions();
    }
  }, [isConnected, fetchInscriptions]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">
            Please connect your Xverse wallet to view your ordinals
          </p>
          <div className="animate-pulse">
            <svg
              className="w-16 h-16 mx-auto text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (ordinals.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No Ordinals Found</h2>
          <p className="text-gray-600">
            You don&apos;t have any ordinals in your wallet yet. Create one in the inscribe page!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Your Ordinals</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ordinals.map((ordinal) => (
            <div
              key={ordinal.inscriptionId}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Inscription #{ordinal.inscriptionNumber}
                  </h3>
                  {ordinal.collectionName && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {ordinal.collectionName}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Type:</span> {ordinal.contentType}
                  </p>
                  <p>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(ordinal.timestamp * 1000).toLocaleDateString()}
                  </p>
                  <p className="truncate">
                    <span className="font-medium">ID:</span> {ordinal.inscriptionId}
                  </p>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <a
                    href={ordinal.explorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    View on Explorer
                  </a>
                  
                  <button
                    onClick={() => {/* Add bridge function here */}}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                  >
                    Bridge to Core
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrdinalsGallery; 