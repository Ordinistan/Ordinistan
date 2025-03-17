import React from 'react';
import { useBitcoinWallet } from '../../utils/BitcoinWalletContext';
import Image from 'next/image';

const BitcoinConnectButton = () => {
  const { connectWallet, disconnectWallet, isConnected, address } = useBitcoinWallet();

  return (
    <button
      onClick={isConnected ? disconnectWallet : connectWallet}
      className="ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-core-primary hover:bg-core-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-core-primary transition-all duration-200"
    >
      <Image
        src="/xverse-logo.svg"
        alt="Xverse"
        width={20}
        height={20}
        className="mr-2"
      />
      {isConnected ? (
        <span>
          {address?.slice(0, 4)}...{address?.slice(-4)}
        </span>
      ) : (
        'Connect Xverse'
      )}
    </button>
  );
};

export default BitcoinConnectButton; 