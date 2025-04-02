import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { NFT } from './useWalletNFTs';

// GraphQL query to get all bridged ordinals
const ALL_BRIDGED_ORDINALS_QUERY = `
  query GetAllBridgedOrdinals {
    ordinalBridgeds(first: 100) {
      id
      tokenId
      inscriptionId
      receiver
      timestamp
      blockTimestamp
      transactionHash
    }
  }
`;

// GraphQL query to get all marketplace orders
const ALL_MARKETPLACE_ORDERS_QUERY = `
  query GetAllMarketplaceOrders {
    orderCreateds(first: 100) {
      id
      orderId
      tokenId
      seller
      pricePerNFT
      blockTimestamp
    }
  }
`;

// GraphQL query to get cancelled and completed orders
const INACTIVE_ORDERS_QUERY = `
  query GetInactiveOrders {
    orderCancelleds {
      id
      orderId
      blockTimestamp
    }
    orderPurchaseds {
      id
      orderId
      blockTimestamp
    }
    bidAccepteds {
      id
      orderId
      blockTimestamp
    }
  }
`;

export function useAllNFTs() {
  const [allNFTs, setAllNFTs] = useState<NFT[]>([]);
  const [listedNFTs, setListedNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch token URI and metadata
  const fetchTokenURI = useCallback(async (tokenId: string): Promise<string> => {
    try {
      // Use the public RPC URL
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Create contract interface for the bridged ordinals
      const bridgeContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
        [
          "function tokenURI(uint256 tokenId) view returns (string)",
        ],
        provider
      );
      
      // Get token URI
      const tokenURI = await bridgeContract.tokenURI(tokenId);
      return tokenURI;
    } catch (err) {
      console.error(`Error fetching tokenURI for ${tokenId}:`, err);
      return '';
    }
  }, []);

  const fetchNFTs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use The Graph endpoint
      const graphEndpoint = process.env.NEXT_PUBLIC_GRAPH_ENDPOINT;
      if (!graphEndpoint) {
        throw new Error('Graph endpoint not configured');
      }

      // Fetch all bridged ordinals
      const bridgedResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ALL_BRIDGED_ORDINALS_QUERY
        })
      });

      if (!bridgedResponse.ok) {
        throw new Error(`Failed to fetch bridged ordinals: ${bridgedResponse.statusText}`);
      }

      const bridgedResult = await bridgedResponse.json();
      const bridgedOrdinals = bridgedResult.data?.ordinalBridgeds || [];

      // Fetch all active marketplace orders
      const activeListingsResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ALL_MARKETPLACE_ORDERS_QUERY
        })
      });

      if (!activeListingsResponse.ok) {
        throw new Error(`Failed to fetch active listings: ${activeListingsResponse.statusText}`);
      }

      const activeListingsResult = await activeListingsResponse.json();
      const activeListings = activeListingsResult.data?.orderCreateds || [];

      // Create a map of token IDs to their listing info
      const listingMap = new Map();
      activeListings.forEach((listing: any) => {
        listingMap.set(listing.tokenId.toString(), {
          orderId: listing.orderId.toString(),
          price: ethers.formatEther(listing.pricePerNFT || '0'),
          seller: listing.seller
        });
      });

      // Fetch cancelled and completed orders to exclude them
      const inactiveOrdersResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: INACTIVE_ORDERS_QUERY
        })
      });

      const inactiveOrdersResult = await inactiveOrdersResponse.json();
      const cancelledOrders = inactiveOrdersResult.data?.orderCancelleds || [];
      const purchasedOrders = inactiveOrdersResult.data?.orderPurchaseds || [];
      const acceptedBids = inactiveOrdersResult.data?.bidAccepteds || [];

      // Create a set of inactive order IDs
      const inactiveOrderIds = new Set();
      cancelledOrders.forEach((order: any) => inactiveOrderIds.add(order.orderId.toString()));
      purchasedOrders.forEach((order: any) => inactiveOrderIds.add(order.orderId.toString()));
      acceptedBids.forEach((bid: any) => inactiveOrderIds.add(bid.orderId.toString()));

      // Filter out any listings that have been cancelled or completed
      listingMap.forEach((listing, tokenId) => {
        if (inactiveOrderIds.has(listing.orderId)) {
          listingMap.delete(tokenId);
        }
      });

      // Process bridged ordinals and create NFT objects
      const processedNfts = await Promise.all(bridgedOrdinals.map(async (ordinal: any) => {
        const tokenId = ordinal.tokenId.toString();
        const inscriptionId = ordinal.inscriptionId;
        const isListed = listingMap.has(tokenId);
        const listingInfo = isListed ? listingMap.get(tokenId) : null;
        
        // Fetch token URI and metadata
        let tokenURI = '';
        let imageUrl = '';
        let metadataFromURI = null;
        
        try {
          tokenURI = await fetchTokenURI(tokenId);
          
          // Parse metadata if available
          if (tokenURI) {
            try {
              // If tokenURI is an IPFS URI, replace with gateway URL
              if (tokenURI.startsWith('ipfs://')) {
                const ipfsHash = tokenURI.replace('ipfs://', '');
                tokenURI = `https://ipfs.io/ipfs/${ipfsHash}`;
              }
              
              // Try to fetch and parse JSON metadata
              const metadataResponse = await fetch(tokenURI);
              metadataFromURI = await metadataResponse.json();
              
              // Get image URL from metadata
              if (metadataFromURI && metadataFromURI.image) {
                imageUrl = metadataFromURI.image;
                
                // Convert IPFS URL to HTTP if needed
                if (imageUrl.startsWith('ipfs://')) {
                  const ipfsHash = imageUrl.replace('ipfs://', '');
                  imageUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                }
              }
            } catch (err) {
              console.log(`TokenURI is not JSON: ${tokenURI}`);
              // If tokenURI is not JSON and looks like an image URL, use it directly
              if (tokenURI.match(/\.(jpeg|jpg|gif|png)$/i)) {
                imageUrl = tokenURI;
              }
            }
          }
        } catch (err) {
          console.error(`Error fetching token URI for ${tokenId}:`, err);
        }

        // Get inscription number from the metadata if available
        const inscriptionNumber = inscriptionId 
          ? parseInt(inscriptionId.split('i')[0], 16) % 100000000 // Simple way to get a reasonable number
          : 0;

        // Get attributes from metadata if available
        const getAttributeValue = (traitType: string, defaultValue: any) => {
          if (!metadataFromURI?.attributes || !Array.isArray(metadataFromURI.attributes)) {
            return defaultValue;
          }
          
          const attribute = metadataFromURI.attributes.find((attr: any) => attr.trait_type === traitType);
          return attribute?.value !== undefined ? attribute.value : defaultValue;
        };
        
        return {
          tokenId,
          name: metadataFromURI?.name || `Ordinal #${inscriptionNumber || tokenId}`,
          description: metadataFromURI?.description || `Bitcoin Ordinal ${inscriptionId || tokenId}`,
          image: imageUrl,
          seller: isListed ? listingInfo.seller : undefined,
          price: isListed ? `${listingInfo.price} CORE` : undefined,
          isListed: isListed,
          orderId: isListed ? listingInfo.orderId : undefined,
          tokenURI: tokenURI,
          metadata: {
            inscriptionId: getAttributeValue('Inscription ID', inscriptionId),
            inscriptionNumber,
            contentType: getAttributeValue('Content Type', ordinal.contentURI || 'image/png'),
            contentLength: getAttributeValue('Content Length', 0),
            satOrdinal: getAttributeValue('Sat Ordinal', ordinal.timestamp?.toString() || '0'),
            satRarity: getAttributeValue('Sat Rarity', 'common'),
            genesisTimestamp: getAttributeValue('Genesis Timestamp', parseInt(ordinal.timestamp || ordinal.blockTimestamp, 10)),
            bridgeTimestamp: getAttributeValue('Bridge Timestamp', parseInt(ordinal.blockTimestamp, 10))
          }
        };
      }));

      // Separate listed and all NFTs
      const listed = processedNfts.filter((nft: NFT) => nft.isListed);
      
      setAllNFTs(processedNfts);
      setListedNFTs(listed);
    } catch (err: any) {
      console.error('Error fetching NFTs:', err);
      setError(err.message || 'Failed to fetch NFTs');
      setAllNFTs([]);
      setListedNFTs([]);
    } finally {
      setLoading(false);
    }
  }, [fetchTokenURI]);

  // Fetch NFTs when component mounts
  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    allNFTs,
    listedNFTs,
    loading,
    error,
    refreshNFTs: fetchNFTs
  };
}