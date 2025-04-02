import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import bridgeAbi from './Bridge.json';
import { useRouter } from 'next/router';

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
  tokenId: string;
  name: string;
  description: string;
  image: string;
  seller?: string;
  price?: string;
  isListed?: boolean;
  orderId?: string;
  metadata?: NFTMetadata;
  tokenURI?: string;
}

// Use a complete ABI with exact structure to avoid decoding errors
const BRIDGE_CONTRACT_ABI = bridgeAbi;

// GraphQL query for bridged ordinals
const BRIDGED_ORDINALS_QUERY = `
  query GetBridgedOrdinals($address: String!) {
    ordinalBridgeds(where: {receiver: $address}) {
      id
      transactionHash
      tokenId
      inscriptionId
      receiver
      contentURI
      timestamp
      blockNumber
      blockTimestamp
    }
  }
`;

// GraphQL query for marketplace events
const MARKETPLACE_LISTINGS_QUERY = `
  query GetMarketplaceEvents {
    orderCreateds(orderBy: blockTimestamp, orderDirection: desc) {
      id
      transactionHash
      tokenId
      startTime
      seller
      paymentToken
      pricePerNFT
      orderId
      nftContract
      copies
      endTime
      blockTimestamp
      blockNumber
    }
    orderPurchaseds(orderBy: blockTimestamp, orderDirection: desc) {
      id
      transactionHash
      orderId
      buyer
      copies
      blockTimestamp
      blockNumber
    }
    orderCancelleds(orderBy: blockTimestamp, orderDirection: desc) {
      id
      transactionHash
      orderId
      blockTimestamp
      blockNumber
    }
    bidAccepteds(orderBy: blockTimestamp, orderDirection: desc) {
      id
      transactionHash
      orderId
      bidId
      blockTimestamp
      blockNumber
    }
  }
`;

// Add a more comprehensive query to get all bid acceptances with token IDs
const SOLD_BIDS_QUERY = `
  query GetSoldBids {
    bidAccepteds {
      id
      orderId
      bidId
      blockTimestamp
    }
    orderCreateds {
      orderId
      tokenId
      seller
    }
  }
`;

// GraphQL query for transfers to capture purchased NFTs
const TRANSFERS_QUERY = `
  query GetNFTTransfers($address: String!) {
    transfers(where: {to: $address}, orderBy: blockTimestamp, orderDirection: desc, first: 1000) {
      id
      transactionHash
      tokenId
      from
      to
      blockTimestamp
      blockNumber
    }
  }
`;

// Also get transfers FROM the user to track sales
const OUTGOING_TRANSFERS_QUERY = `
  query GetOutgoingTransfers($address: String!) {
    transfers(where: {from: $address}, orderBy: blockTimestamp, orderDirection: desc, first: 1000) {
      id
      transactionHash
      tokenId
      from
      to
      blockTimestamp
      blockNumber
    }
  }
`;

export function useWalletNFTs() {
  const { address, isConnected } = useAccount();
  const [listedNFTs, setListedNFTs] = useState<NFT[]>([]);
  const [unlistedNFTs, setUnlistedNFTs] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Function to fetch token URI by token ID
  const fetchTokenURI = useCallback(async (tokenId: string) => {
    try {
      // Get RPC URL from environment variables
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      if (!rpcUrl) {
        throw new Error('RPC URL not configured');
      }

      // Get bridge contract address from environment variables
      const bridgeContractAddress = process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS;
      if (!bridgeContractAddress) {
        throw new Error('Bridge contract address not configured');
      }

      // Create a provider
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Create contract instance
      const bridgeContract = new ethers.Contract(
        bridgeContractAddress,
        BRIDGE_CONTRACT_ABI,
        provider
      );

      // Call tokenURI function on the contract
      const tokenURI = await bridgeContract.tokenURI(tokenId);

      return tokenURI;
    } catch (err: any) {
      console.error(`Error fetching token URI for token ${tokenId}:`, err);
      return null;
    }
  }, []);

  // Function to fetch NFTs, extracted to be reusable
  const fetchNFTs = useCallback(async () => {
    if (!address || !isConnected) {
      setListedNFTs([]);
      setUnlistedNFTs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching NFTs for address: ${address}`);

      // Use The Graph endpoint
      const graphEndpoint = process.env.NEXT_PUBLIC_GRAPH_ENDPOINT;
      if (!graphEndpoint) {
        throw new Error('Graph endpoint not configured');
      }

      // Step 1: Get ALL bridge ordinals - for a complete view of the system
      const ALL_ORDINALS_QUERY = `
        query GetAllOrdinals {
          ordinalBridgeds(first: 1000) {
            id
            tokenId
            inscriptionId
            receiver
            contentURI
            timestamp
            blockTimestamp
          }
        }
      `;

      const allOrdinalsResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ALL_ORDINALS_QUERY
        })
      });

      if (!allOrdinalsResponse.ok) {
        throw new Error(`Failed to fetch all ordinals: ${allOrdinalsResponse.statusText}`);
      }

      const allOrdinalsResult = await allOrdinalsResponse.json();
      const allOrdinals = allOrdinalsResult.data?.ordinalBridgeds || [];
      console.log(`Found ${allOrdinals.length} total ordinals on chain`);

      // Step 2: Get ALL transfers - to track current ownership
      const ALL_TRANSFERS_QUERY = `
        query GetAllTransfers {
          transfers(first: 1000, orderBy: blockTimestamp, orderDirection: desc) {
            id
            tokenId
            from
            to
            blockTimestamp
          }
        }
      `;

      const allTransfersResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ALL_TRANSFERS_QUERY
        })
      });

      if (!allTransfersResponse.ok) {
        throw new Error(`Failed to fetch all transfers: ${allTransfersResponse.statusText}`);
      }

      const allTransfersResult = await allTransfersResponse.json();
      const allTransfers = allTransfersResult.data?.transfers || [];
      console.log(`Found ${allTransfers.length} total transfers on chain`);

      // Step 3: Get ALL marketplace orders
      const ALL_ORDERS_QUERY = `
        query GetAllOrders {
          orderCreateds(first: 1000) {
            id
            orderId
            tokenId
            seller
            pricePerNFT
            blockTimestamp
          }
          orderCancelleds(first: 1000) {
            id
            orderId
            blockTimestamp
          }
          orderPurchaseds(first: 1000) {
            id
            orderId
            buyer
            copies
            blockTimestamp
          }
          bidAccepteds(first: 1000) {
            id
            orderId
            bidId
            blockTimestamp
          }
        }
      `;

      const allOrdersResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ALL_ORDERS_QUERY
        })
      });

      if (!allOrdersResponse.ok) {
        throw new Error(`Failed to fetch all orders: ${allOrdersResponse.statusText}`);
      }

      const allOrdersResult = await allOrdersResponse.json();
      const orderCreations = allOrdersResult.data?.orderCreateds || [];
      const orderCancellations = allOrdersResult.data?.orderCancelleds || [];
      const orderPurchases = allOrdersResult.data?.orderPurchaseds || [];
      const bidAcceptances = allOrdersResult.data?.bidAccepteds || [];

      console.log(`Found ${orderCreations.length} order creations, ${orderCancellations.length} cancellations, ${orderPurchases.length} purchases, ${bidAcceptances.length} accepted bids`);

      // Step 4: Process data to determine current ownership status

      // Map order ID to its details
      const orderDetailsMap = new Map();
      orderCreations.forEach((order: any) => {
        orderDetailsMap.set(order.orderId.toString(), {
          tokenId: order.tokenId.toString(),
          seller: order.seller,
          price: ethers.formatEther(order.pricePerNFT || '0'),
          timestamp: order.blockTimestamp
        });
      });

      // Create a set of all inactive order IDs (cancelled, purchased, or bid-accepted)
      const inactiveOrderIds = new Set<string>();
      // Add cancelled orders
      orderCancellations.forEach((cancellation: any) => {
        inactiveOrderIds.add(cancellation.orderId.toString());
      });
      // Add purchased orders
      orderPurchases.forEach((purchase: any) => {
        inactiveOrderIds.add(purchase.orderId.toString());
      });
      // Add bid-accepted orders
      bidAcceptances.forEach((acceptance: any) => {
        inactiveOrderIds.add(acceptance.orderId.toString());
      });

      console.log(`Total inactive orders: ${inactiveOrderIds.size}`);

      // Build a map of token IDs to their current owners based on transfers
      const tokenOwnershipMap = new Map();

      // First, set initial ownership from bridging
      allOrdinals.forEach((ordinal: any) => {
        tokenOwnershipMap.set(ordinal.tokenId.toString(), ordinal.receiver.toLowerCase());
      });

      // Sort transfers chronologically (latest first)
      const sortedTransfers = [...allTransfers].sort((a, b) => 
        parseInt(b.blockTimestamp) - parseInt(a.blockTimestamp)
      );

      // For each token, find the latest transfer and update ownership
      const latestTransferByToken = new Map();
      sortedTransfers.forEach((transfer: any) => {
        const tokenId = transfer.tokenId.toString();
        if (!latestTransferByToken.has(tokenId)) {
          latestTransferByToken.set(tokenId, transfer);
          tokenOwnershipMap.set(tokenId, transfer.to.toLowerCase());
        }
      });

      // Step 5: Identify active listings
      const activeListings = new Map();
      orderCreations.forEach((order: any) => {
        const orderId = order.orderId.toString();
        // Only include if the order is not cancelled, purchased, or had a bid accepted
        if (!inactiveOrderIds.has(orderId)) {
          activeListings.set(order.tokenId.toString(), {
            orderId,
            seller: order.seller.toLowerCase(),
            price: ethers.formatEther(order.pricePerNFT || '0')
          });
        }
      });

      console.log(`Found ${activeListings.size} active listings`);

      // Step 6: Create a comprehensive list of token IDs to check
      const allTokenIds = new Set<string>();
      
      // Add all known ordinals
      allOrdinals.forEach((ordinal: any) => {
        allTokenIds.add(ordinal.tokenId.toString());
      });
      
      // Add all tokens from transfers
      allTransfers.forEach((transfer: any) => {
        allTokenIds.add(transfer.tokenId.toString());
      });
      
      // Add all tokens from order creations
      orderCreations.forEach((order: any) => {
        allTokenIds.add(order.tokenId.toString());
      });

      console.log(`Total unique token IDs to check: ${allTokenIds.size}`);

      // Step 7: Check on-chain ownership for verification
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const bridgeContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
        ["function ownerOf(uint256 tokenId) view returns (address)"],
        provider
      );
      
      // Track tokens directly owned by current user
      const userOwnedTokens = new Set<string>();
      
      // Check each token's ownership on-chain
      for (const tokenId of Array.from(allTokenIds)) {
        try {
          const owner = await bridgeContract.ownerOf(tokenId);
          const ownerAddress = owner.toLowerCase();
          
          // Check if token is in marketplace
          if (ownerAddress === process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!.toLowerCase()) {
            // If this token has an active listing by the current user, mark as owned by user
            const listing = activeListings.get(tokenId);
            if (listing && listing.seller.toLowerCase() === address.toLowerCase()) {
              userOwnedTokens.add(tokenId);
              console.log(`User owns listed token ${tokenId} (listed by user, orderId: ${listing.orderId})`);
            }
          } 
          // If owned directly by current user
          else if (ownerAddress === address.toLowerCase()) {
            userOwnedTokens.add(tokenId);
            console.log(`User directly owns token ${tokenId}`);
          }
          
          // Update ownership map with on-chain data
          tokenOwnershipMap.set(tokenId, ownerAddress);
          
        } catch (err) {
          console.error(`Error checking ownership for token ${tokenId}:`, err);
        }
      }

      console.log(`User directly owns ${userOwnedTokens.size} tokens`);

      // Step 8: Process NFT data to create final NFT objects
      const nftsOwnedByUser: NFT[] = [];
      
      // Process each token ID
      for (const tokenId of Array.from(allTokenIds)) {
        // Skip if we already know user doesn't own this token
        const currentOwner = tokenOwnershipMap.get(tokenId);
        const isUserListing = activeListings.has(tokenId) && 
                             activeListings.get(tokenId)?.seller === address.toLowerCase();
        
        if (currentOwner !== address.toLowerCase() && !isUserListing && !userOwnedTokens.has(tokenId)) {
          continue;
        }

        // Find ordinal data for this token
        const ordinalData = allOrdinals.find((o: any) => o.tokenId.toString() === tokenId);
        let inscriptionId = tokenId;
        
        if (ordinalData) {
          inscriptionId = ordinalData.inscriptionId;
          if (!inscriptionId.endsWith('i0')) {
            inscriptionId = `${inscriptionId}i0`;
          }
        }
        
        // Check if token is listed
        const listingInfo = activeListings.get(tokenId);
        const isListed = !!listingInfo;
        
        // Fetch token metadata
        const tokenURI = await fetchTokenURI(tokenId);
        let metadataFromURI = null;
        let imageUrl = '';
        
        if (tokenURI) {
          try {
            // Handle different token URI formats
            if (tokenURI.startsWith('data:application/json;base64,')) {
              const base64Data = tokenURI.split(',')[1];
              const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
              metadataFromURI = JSON.parse(decodedData);
              imageUrl = metadataFromURI?.image || '';
            }
            else if (tokenURI.startsWith('{')) {
              metadataFromURI = JSON.parse(tokenURI);
              imageUrl = metadataFromURI?.image || '';
            } 
            else {
              try {
                const response = await fetch(tokenURI);
                const data = await response.json();
                metadataFromURI = data;
                imageUrl = data.image || '';
              } catch (fetchErr) {
                if (tokenURI.match(/\.(jpeg|jpg|gif|png)$/i)) {
                  imageUrl = tokenURI;
                }
              }
            }
          } catch (err) {
            if (tokenURI.match(/\.(jpeg|jpg|gif|png)$/i)) {
              imageUrl = tokenURI;
            }
          }
        }

        // Generate inscription number
        const inscriptionNumber = inscriptionId 
          ? parseInt(inscriptionId.split('i')[0], 16) % 100000000 
          : 0;
          
        // Extract metadata attributes
        const getAttributeValue = (traitType: string, defaultValue: any) => {
          if (!metadataFromURI?.attributes || !Array.isArray(metadataFromURI.attributes)) {
            return defaultValue;
          }
          
          const attribute = metadataFromURI.attributes.find((attr: any) => attr.trait_type === traitType);
          return attribute?.value !== undefined ? attribute.value : defaultValue;
        };
        
        // Create NFT object and add to array
        nftsOwnedByUser.push({
          tokenId,
          name: metadataFromURI?.name || `Ordinal #${inscriptionNumber || tokenId}`,
          description: metadataFromURI?.description || `Bitcoin Ordinal ${inscriptionId || tokenId}`,
          image: imageUrl,
          seller: isListed ? listingInfo.seller : undefined,
          price: isListed ? `${listingInfo.price} CORE` : undefined,
          isListed,
          orderId: isListed ? listingInfo.orderId : undefined,
          tokenURI,
          metadata: {
            inscriptionId: getAttributeValue('Inscription ID', inscriptionId),
            inscriptionNumber,
            contentType: getAttributeValue('Content Type', ordinalData?.contentURI || 'image/png'),
            contentLength: getAttributeValue('Content Length', 0),
            satOrdinal: getAttributeValue('Sat Ordinal', ordinalData?.timestamp?.toString() || '0'),
            satRarity: getAttributeValue('Sat Rarity', 'common'),
            genesisTimestamp: getAttributeValue('Genesis Timestamp', parseInt(ordinalData?.timestamp || ordinalData?.blockTimestamp || '0', 10)),
            bridgeTimestamp: getAttributeValue('Bridge Timestamp', parseInt(ordinalData?.blockTimestamp || '0', 10))
          }
        });
      }
      
      console.log(`Found ${nftsOwnedByUser.length} NFTs owned by user`);
      
      // Split into listed and unlisted
      const listed = nftsOwnedByUser.filter(nft => nft.isListed);
      const unlisted = nftsOwnedByUser.filter(nft => !nft.isListed);
      
      console.log(`User has ${listed.length} listed NFTs and ${unlisted.length} unlisted NFTs`);
      
      // Set state
      setListedNFTs(listed);
      setUnlistedNFTs(unlisted);
      
    } catch (err: any) {
      console.error('Error fetching NFTs:', err);
      setError(err.message || 'Failed to fetch NFTs');
      setListedNFTs([]);
      setUnlistedNFTs([]);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, fetchTokenURI]);

  // Fetch NFTs when component mounts or address changes
  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  // Refresh NFTs when returning to relevant pages
  useEffect(() => {
    const handleRouteChange = () => {
      const nftDisplayPages = ['/portfolio', '/', '/explore', '/nft/[id]'];
      const currentPath = router.pathname;
      if (nftDisplayPages.some(page => currentPath.startsWith(page.replace('[id]', '')))) {
        console.log('Refreshing NFTs on page change');
        fetchNFTs();
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router, fetchNFTs]);

  return {
    listedNFTs,
    unlistedNFTs,
    loading,
    error,
    isConnected,
    refreshNFTs: fetchNFTs,
    fetchTokenURI
  };
}