import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAddress, AddressPurpose, BitcoinNetworkType, createInscription, request } from 'sats-connect';

// No need to redeclare the Window interface since it's defined in types/window.d.ts

interface Ordinal {
  inscriptionId: string;
  inscriptionNumber: string;
  contentType: string;
  genesisTransaction: string;
  output: string;
  location?: string;
  explorer?: string;
  timestamp: number;
  collectionName?: string | null;
}

interface BitcoinWalletContextType {
  address: string | null;
  ordinalsAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
  ordinals: Ordinal[];
  inscribe: (content: string, contentType: string, isBase64?: boolean) => Promise<string>;
  fetchInscriptions: () => Promise<void>;
}

const BitcoinWalletContext = createContext<BitcoinWalletContextType>({
  address: null,
  ordinalsAddress: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isConnected: false,
  ordinals: [],
  inscribe: async () => '',
  fetchInscriptions: async () => {},
});

export const BitcoinWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [ordinalsAddress, setOrdinalsAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ordinals, setOrdinals] = useState<Ordinal[]>([]);

  const fetchInscriptions = async () => {
    if (!isConnected || !ordinalsAddress) return;

    try {
      
      // Using Hiro Ordinals API
      const response = await fetch(`https://api.hiro.so/ordinals/v1/inscriptions?address=${ordinalsAddress}&limit=20`);
      const data = await response.json();
      
      
      if (data && data.results) {
        console.log('Inscriptions data:', data.results);
        const formattedOrdinals = data.results.map((inscription: any) => ({
          inscriptionId: `${inscription.id}i0`,
          inscriptionNumber: inscription.number.toString(),
          contentType: inscription.content_type,
          genesisTransaction: inscription.genesis_tx_id,
          output: inscription.output,
          location: inscription.location,
          explorer: `https://ordinals.com/inscription/${inscription.id}i0`,
          timestamp: Math.floor(new Date(inscription.timestamp).getTime() / 1000),
          collectionName: null // Can be added if available in metadata
        }));

        setOrdinals(formattedOrdinals);
      } else {
        console.log('No inscriptions found in response');
        setOrdinals([]);
      }
    } catch (error) {
      console.error('Error fetching inscriptions:', error);
      setOrdinals([]);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchInscriptions();
    } else {
      setOrdinals([]);
    }
  }, [isConnected]);

  const inscribe = async (content: string, contentType: string, isBase64: boolean = false): Promise<string> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    return new Promise((resolve, reject) => {
      createInscription({
        payload: {
          network: {
            type: BitcoinNetworkType.Mainnet,
          },
          contentType,
          content,
          payloadType: isBase64 ? "BASE_64" : "PLAIN_TEXT",
          suggestedMinerFeeRate: 10,
        },
        onFinish: (response) => {
          resolve(response.txId);
        },
        onCancel: () => {
          reject(new Error('User cancelled inscription'));
        },
      });
    });
  };

  const connectWallet = async () => {
    try {
      const getAddressOptions = {
        payload: {
          purposes: [AddressPurpose.Payment, AddressPurpose.Ordinals],
          message: 'Address for receiving Ordinals',
          network: {
            type: BitcoinNetworkType.Mainnet,
          },
        },
        onFinish: (response: any) => {
          setAddress(response.addresses[0].address);
          setOrdinalsAddress(response.addresses[1].address);
          setIsConnected(true);
          console.log('Connected addresses:', response.addresses);
        },
        onCancel: () => alert('User canceled wallet connection'),
      };

      await getAddress(getAddressOptions);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Make sure you have Xverse wallet installed.');
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setOrdinalsAddress(null);
    setIsConnected(false);
  };

  return (
    <BitcoinWalletContext.Provider
      value={{
        address,
        ordinalsAddress,
        connectWallet,
        disconnectWallet,
        isConnected,
        ordinals,
        inscribe,
        fetchInscriptions,
      }}
    >
      {children}
    </BitcoinWalletContext.Provider>
  );
};

export const useBitcoinWallet = () => useContext(BitcoinWalletContext); 