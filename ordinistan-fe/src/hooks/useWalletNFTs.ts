import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useContractReads } from 'wagmi';
import { ethers } from 'ethers';

export interface NFTMetadata {
  inscriptionId: string;
  inscriptionNumber: number;
  contentType: string;
  contentLength: number;
  satOrdinal: string;
  satRarity: string;
  genesisTimestamp: number;
  bridgeTimestamp: number;
}

export interface NFT {
  id: number;
  tokenId: string;
  name: string;
  image: string;
  price: string;
  creator: string;
  isListed: boolean;
  metadata: NFTMetadata;
}

// Type guard for NFT
function isNFT(nft: any): nft is NFT {
  return nft !== null &&
         typeof nft.id === 'number' &&
         typeof nft.tokenId === 'string' &&
         typeof nft.name === 'string' &&
         typeof nft.image === 'string' &&
         typeof nft.price === 'string' &&
         typeof nft.creator === 'string' &&
         typeof nft.isListed === 'boolean' &&
         nft.metadata !== null;
}

const BRIDGE_CONTRACT_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function ordinalMetadata(uint256 tokenId) external view returns (tuple(string inscriptionId, uint256 inscriptionNumber, string contentType, uint256 contentLength, uint256 satOrdinal, string satRarity, uint256 genesisTimestamp, uint256 bridgeTimestamp))',
  'function getListingPrice(uint256 tokenId) external view returns (uint256)',
  'function isListed(uint256 tokenId) external view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

export function useWalletNFTs() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!address || !isConnected) {
        setNfts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Create contract instance
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const contract = new ethers.Contract(
          process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
          BRIDGE_CONTRACT_ABI,
          provider
        );

        // Get user's NFT balance
        const balance = await contract.balanceOf(address);
        console.log("User balance:", balance.toString());
        
        if (balance === 0) {
          setNfts([]);
          setLoading(false);
          return;
        }

        // Fetch all NFTs in parallel with better error handling
        const nftPromises = Array.from({ length: Number(balance) }, async (_, i) => {
          try {
            // Get token ID for this index
            const tokenId = await contract.tokenOfOwnerByIndex(address, i);
            console.log(`Token ID at index ${i}:`, tokenId.toString());

            // Verify ownership
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() !== address.toLowerCase()) {
              console.log(`Token ${tokenId} ownership verification failed`);
              return null;
            }

            // Get metadata and listing status in parallel
            const [metadata, listingPrice] = await Promise.all([
              contract.ordinalMetadata(tokenId).catch((err: any) => {
                console.error(`Error fetching metadata for token ${tokenId}:`, err);
                return null;
              }),
              contract.getListingPrice(tokenId).catch((err: any) => {
                console.error(`Error fetching listing price for token ${tokenId}:`, err);
                return BigInt(0);
              }),
            ]);

            if (!metadata) {
              console.log(`No metadata found for token ${tokenId}`);
              return null;
            }

            // Construct NFT object
            const nft: NFT = {
              id: i + 1,
              tokenId: tokenId.toString(),
              name: `Ordinistan #${metadata.inscriptionNumber}`,
              image: `https://api.hiro.so/ordinals/v1/inscriptions/${metadata.inscriptionId}/preview`,
              price: listingPrice > 0 ? ethers.formatEther(listingPrice) + ' CORE' : 'Not Listed',
              creator: address,
              isListed: listingPrice > 0,
              metadata: {
                ...metadata,
                satOrdinal: metadata.satOrdinal.toString(),
              },
            };

            return nft;
          } catch (err) {
            console.error(`Error fetching NFT at index ${i}:`, err);
            return null;
          }
        });

        // Wait for all NFTs to be fetched and filter out any failed fetches
        const fetchedNfts = (await Promise.all(nftPromises)).filter(isNFT);
        console.log("Fetched NFTs:", fetchedNfts);
        
        setNfts(fetchedNfts);
      } catch (err) {
        console.error('Error fetching NFTs:', err);
        setError('Failed to fetch NFTs from your wallet. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [address, isConnected]);

  // Return listed and unlisted NFTs separately
  const listedNFTs = nfts.filter(nft => nft.isListed);
  const unlistedNFTs = nfts.filter(nft => !nft.isListed);

  return {
    nfts,
    listedNFTs,
    unlistedNFTs,
    loading,
    error,
    isConnected,
  };
} 