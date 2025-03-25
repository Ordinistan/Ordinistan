import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import bridgeAbi from './bridge.json';
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
  id: number;
  tokenId: string;
  name: string;
  image: string;
  price: string;
  creator: string;
  isListed: boolean;
  orderId?: string; // Added for marketplace interaction
  seller?: string; // Added to track seller
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

// Use a complete ABI with exact structure to avoid decoding errors
const BRIDGE_CONTRACT_ABI = bridgeAbi;

// GraphQL query for bridged ordinals
const BRIDGED_ORDINALS_QUERY = `
  query GetBridgedOrdinals($address: String!) {
    bridgeEventOrdinalBridgeds(where: {receiver_eq: $address}) {
      id
      transactionHash
      tokenId
      satOrdinal
      receiver
      inscriptionId
      eventName
      contract
      contentType
      blockTimestamp
      blockNumber
    }
  }
`;

// GraphQL query for marketplace events
const MARKETPLACE_LISTINGS_QUERY = `
  query GetMarketplaceEvents {
    marketplaceEventOrderCreateds(orderBy: blockTimestamp_DESC) {
      id
      transactionHash
      tokenId
      startTime
      seller
      paymentToken
      pricePerNft
      orderId
      nftContract
      eventName
      endTime
      copies
      contract
      blockTimestamp
      blockNumber
    }
    marketplaceEventOrderPurchaseds(orderBy: blockTimestamp_DESC) {
      id
      transactionHash
      orderId
      eventName
      copies
      contract
      buyer
      blockTimestamp
      blockNumber
    }
    marketplaceEventOrderCancelleds(orderBy: blockTimestamp_DESC) {
      id
      transactionHash
      orderId
      eventName
      contract
      blockTimestamp
      blockNumber
    }
    marketplaceEventBidAccepteds(orderBy: blockTimestamp_DESC) {
      id
      transactionHash
      orderId
      bidId
      copies
      eventName
      contract
      blockTimestamp
      blockNumber
    }
  }
`;

// GraphQL query for transfers to capture purchased NFTs
const TRANSFERS_QUERY = `
  query GetNFTTransfers($address: String!) {
    bridgeEventTransfers(where: {to_eq: $address}, orderBy: blockTimestamp_DESC) {
      id
      transactionHash
      tokenId
      from
      to
      eventName
      contract
      blockTimestamp
      blockNumber
    }
  }
`;

export function useWalletNFTs() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Function to fetch NFTs, extracted to be reusable
  const fetchNFTs = useCallback(async () => {
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
      
      const subsquidEndpoint = "http://52.64.159.183:4350/graphql";
      
      // Fetch marketplace events
      const marketplaceResponse = await fetch(subsquidEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: MARKETPLACE_LISTINGS_QUERY
        }),
      });

      if (!marketplaceResponse.ok) {
        throw new Error(`Subsquid API error for marketplace: ${marketplaceResponse.statusText}`);
      }

      const marketplaceResult = await marketplaceResponse.json();

      // Process marketplace events to track which NFTs are listed, purchased, or cancelled
      const createdOrders = marketplaceResult.data?.marketplaceEventOrderCreateds || [];
      const purchasedOrders = marketplaceResult.data?.marketplaceEventOrderPurchaseds || [];
      const cancelledOrders = marketplaceResult.data?.marketplaceEventOrderCancelleds || [];
      const acceptedBids = marketplaceResult.data?.marketplaceEventBidAccepteds || [];

      const purchasedOrderIds = new Set(purchasedOrders.map((order: any) => order.orderId));
      const cancelledOrderIds = new Set(cancelledOrders.map((order: any) => order.orderId));
      const acceptedBidOrderIds = new Set(acceptedBids.map((bid: any) => bid.orderId));

      // Create a mapping of order IDs to their token IDs for accepted bids
      const acceptedBidOrdersToTokenIds: Record<string, string> = {};
      
      for (const bid of acceptedBids) {
        // Find the corresponding order to get the token ID
        const order = createdOrders.find((o: any) => o.orderId === bid.orderId);
        if (order) {
          acceptedBidOrdersToTokenIds[bid.orderId] = order.tokenId;
        }
      }

      // Get token IDs that were sold via accepted bids
      const soldTokenIdsViaBids = Object.values(acceptedBidOrdersToTokenIds);
      console.log("Token IDs sold via accepted bids:", soldTokenIdsViaBids);

      const activeListings = createdOrders.filter((order: any) => 
        !purchasedOrderIds.has(order.orderId) && 
        !cancelledOrderIds.has(order.orderId) &&
        !acceptedBidOrderIds.has(order.orderId) &&
        Number(order.endTime) > Date.now() / 1000 // Not expired
      );

      const bridgedResponse = await fetch(subsquidEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: BRIDGED_ORDINALS_QUERY,
          variables: {
            address: address.toLowerCase(),
          },
        }),
      });

      if (!bridgedResponse.ok) {
        throw new Error(`Subsquid API error for bridged ordinals: ${bridgedResponse.statusText}`);
      }

      const bridgedResult = await bridgedResponse.json();

      const bridgedOrdinals = bridgedResult.data?.bridgeEventOrdinalBridgeds || [];
      

      const transfersResponse = await fetch(subsquidEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: TRANSFERS_QUERY,
          variables: {
            address: address.toLowerCase(),
          },
        }),
      });

      if (!transfersResponse.ok) {
        throw new Error(`Subsquid API error for transfers: ${transfersResponse.statusText}`);
      }

      const transfersResult = await transfersResponse.json();

      const transferredTokenIds = (transfersResult.data?.bridgeEventTransfers || []).map((event: any) => event.tokenId);
      
      // Step 4: Look for NFTs purchased by this user
      const purchasedByUser = purchasedOrders.filter((order: any) => 
        order.buyer && order.buyer.toLowerCase() === address.toLowerCase()
      );
      
      
      // Extract token IDs from purchased orders by correlating with created orders
      const purchasedTokenIds: string[] = [];
      
      // Create a map of created orders by orderId for faster lookup
      const ordersById: Record<string, any> = {};
      createdOrders.forEach((order: any) => {
        ordersById[order.orderId] = order;
      });
      
      // Loop through purchased orders
      for (const purchase of purchasedByUser) {
        // Find the original order to get the token ID
        const originalOrder = ordersById[purchase.orderId];
        if (originalOrder && originalOrder.tokenId) {
          purchasedTokenIds.push(originalOrder.tokenId);
        } 
      }
      
      
      // Step 5: Create a set of token IDs from all sources
      const allTokenIds = new Set([
        ...bridgedOrdinals.map((ordinal: any) => ordinal.tokenId),
        ...activeListings.map((listing: any) => listing.tokenId),
        ...transferredTokenIds,
        ...purchasedTokenIds
      ]);
      
      // If we have no token IDs from events, check contract for ownership
      if (allTokenIds.size === 0) {
        
        try {
          // Check the balance of tokens owned by this address
          const balance = await contract.balanceOf(address);
          
          if (balance > 0) {
            // Try to use enumeration if available
            try {
              for (let i = 0; i < balance; i++) {
                const tokenId = await contract.tokenOfOwnerByIndex(address, i);
                allTokenIds.add(tokenId.toString());
              }
            } catch (enumErr) {
              
              // If enumeration isn't supported, we can try batch checking with recently known token ranges
              // Get recent transfer activity to estimate token ID ranges
              const recentTransfers = transfersResult.data?.bridgeEventTransfers || [];
              let maxTokenId = 0;
              
              // Find the maximum token ID in recent transfers for a reference point
              if (recentTransfers.length > 0) {
                for (const transfer of recentTransfers) {
                  const tokenIdNum = parseInt(transfer.tokenId);
                  if (!isNaN(tokenIdNum) && tokenIdNum > maxTokenId) {
                    maxTokenId = tokenIdNum;
                  }
                }
                
                // If we found a maximum token ID, scan around that range
                if (maxTokenId > 0) {
                  // Scan 100 tokens before and after the maximum token ID
                  const scanRange = 100;
                  
                  // Create batches of 10 checks at a time to avoid overwhelming the RPC
                  for (let start = maxTokenId - scanRange; start <= maxTokenId + scanRange; start += 10) {
                    const checkPromises = [];
                    for (let i = 0; i < 10; i++) {
                      const tokenToCheck = start + i;
                      if (tokenToCheck > 0) { // Avoid invalid token IDs
                        checkPromises.push(
                          (async () => {
                            try {
                              const owner = await contract.ownerOf(tokenToCheck.toString());
                              if (owner.toLowerCase() === address.toLowerCase()) {
                                return tokenToCheck.toString();
                              }
                            } catch {
                              // Skip tokens that don't exist
                            }
                            return null;
                          })()
                        );
                      }
                    }
                    
                    const results = await Promise.all(checkPromises);
                    results.filter(Boolean).forEach(tokenId => {
                      if (tokenId) allTokenIds.add(tokenId);
                    });
                    
                    // If we've found tokens matching the balance, we can stop
                    if (allTokenIds.size >= balance.toNumber()) {
                      break;
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("Error checking token balance:", err);
        }
      }
      
      // Organize listings by token ID for easy lookup
      const listingsByTokenId: Record<string, any> = {};
      activeListings.forEach((listing: any) => {
        listingsByTokenId[listing.tokenId] = listing;
      });

      // Check current ownership and fetch detailed metadata for each token
      const nftsPromises = Array.from(allTokenIds).map(async (tokenId: string, index: number) => {
        try {
          // Check if this token was sold via an accepted bid
          const wasAccepted = soldTokenIdsViaBids.includes(tokenId);
          
          // Find the listing for this token if it exists
          const listing = listingsByTokenId[tokenId];
          
          // Only consider a token as listed if it has an active listing and was not sold via accepted bid
          const isListed = !!listing && !wasAccepted;
          
          // Try to verify ownership for ALL tokens - essential for purchased NFTs
          let isOwned = false;
          try {
            // If it's listed by the current user, we consider it "owned" for UI purposes
            if (isListed && listing.seller.toLowerCase() === address.toLowerCase()) {
              isOwned = true;
            } else {
              // Otherwise check actual ownership - this is crucial for purchased NFTs
              const owner = await contract.ownerOf(tokenId);
              isOwned = owner.toLowerCase() === address.toLowerCase();
            }
            
            if (!isOwned && !isListed) {
              return null;
            }
          } catch (ownerError) {
            console.warn(`Failed to check ownership for ${tokenId}:`, ownerError);
            if (!isListed) return null; // Skip if not listed and ownership check failed
          }
                    
          // Find the bridged ordinal data if available
          const ordinalData = bridgedOrdinals.find((ord: any) => ord.tokenId === tokenId);
          
          // Fetch complete metadata
          let parsedMetadata: NFTMetadata;
          
          try {
            const metadata = await contract.ordinalMetadata(tokenId);
            
            // Handle different response formats
            if (Array.isArray(metadata)) {
              parsedMetadata = {
                inscriptionId: metadata[0],
                inscriptionNumber: Number(metadata[1]),
                contentType: metadata[2],
                contentLength: Number(metadata[3]),
                satOrdinal: metadata[4].toString(),
                satRarity: metadata[5],
                genesisTimestamp: Number(metadata[6]),
                bridgeTimestamp: Number(metadata[7])
              };
            } else if (typeof metadata === 'object') {
              parsedMetadata = {
                inscriptionId: metadata.inscriptionId,
                inscriptionNumber: Number(metadata.inscriptionNumber),
                contentType: metadata.contentType,
                contentLength: Number(metadata.contentLength),
                satOrdinal: metadata.satOrdinal.toString(),
                satRarity: metadata.satRarity,
                genesisTimestamp: Number(metadata.genesisTimestamp),
                bridgeTimestamp: Number(metadata.bridgeTimestamp)
              };
            } else {
              throw new Error("Unexpected metadata format");
            }
          } catch (metadataError) {
            console.warn(`Failed to fetch metadata for ${tokenId}:`, metadataError);
            
            // Use basic metadata from the bridged ordinal if available
            parsedMetadata = {
              inscriptionId: ordinalData?.inscriptionId || 'Unknown',
              inscriptionNumber: 0,
              contentType: ordinalData?.contentType || 'image/png',
              contentLength: 0,
              satOrdinal: ordinalData?.satOrdinal?.toString() || '0',
              satRarity: 'Unknown',
              genesisTimestamp: 0,
              bridgeTimestamp: ordinalData ? Number(new Date(ordinalData.blockTimestamp).getTime() / 1000) : 0
            };
          }
          
          // Create the NFT object with data from both sources
          return {
            id: index + 1,
            tokenId: tokenId,
            name: `Ordinistan #${parsedMetadata.inscriptionNumber || (tokenId.substring(0, 6))}`,
            image: parsedMetadata.inscriptionId !== 'Unknown'
              ? `https://api.hiro.so/ordinals/v1/inscriptions/${parsedMetadata.inscriptionId}/content`
              : `/placeholder-nft.png`,
            price: isListed ? ethers.formatEther(listing.pricePerNft) + ' CORE' : 'Not Listed',
            creator: address,
            isListed: isListed,
            orderId: isListed ? listing.orderId : undefined,
            seller: isListed ? listing.seller : undefined,
            metadata: parsedMetadata
          };
        } catch (err: any) {
          console.error(`Error processing token ${tokenId}:`, err);
          return null;
        }
      });
      
      const nftResults = await Promise.all(nftsPromises);
      // Log the counts of NFTs for debugging
      
      // Filter out null values and ensure all fields are present
      const validNfts = nftResults
        .filter(nft => nft !== null)
        .filter(nft => {
          if (!nft) return false;
          return (
            typeof nft.id === 'number' &&
            typeof nft.tokenId === 'string' &&
            typeof nft.name === 'string' &&
            typeof nft.image === 'string' &&
            typeof nft.price === 'string' &&
            typeof nft.creator === 'string' &&
            typeof nft.isListed === 'boolean' &&
            nft.metadata !== null
          );
        }) as NFT[];
      
      setNfts(validNfts);
    } catch (err: any) {
      console.error('Error fetching NFTs:', err);
      setError('Failed to fetch NFTs from your wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Initial fetch of NFTs
  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  // Refresh NFTs when returning to relevant pages
  useEffect(() => {
    // Pages that display NFTs and should trigger a refresh
    const nftDisplayPages = ['/portfolio', '/', '/explore', '/nft/[id]'];
    
    // Check if the current path matches any of the NFT display pages
    const shouldRefresh = nftDisplayPages.some(page => {
      if (page.includes('[id]')) {
        // For dynamic routes, check if it follows the pattern
        return router.pathname.startsWith('/nft/');
      }
      return router.pathname === page;
    });
    
    if (shouldRefresh) {
      console.log(`Refreshing NFTs due to navigation to ${router.pathname}`);
      fetchNFTs();
    }
  }, [router.pathname, fetchNFTs]);

  // Return listed and unlisted NFTs separately
  const listedNFTs = nfts.filter(nft => 
    nft.isListed && nft.seller && nft.seller.toLowerCase() === address?.toLowerCase()
  );
  const unlistedNFTs = nfts.filter(nft => 
    !nft.isListed
  );

  return {
    nfts,
    listedNFTs,
    unlistedNFTs,
    loading,
    error,
    isConnected,
    refreshNFTs: fetchNFTs // Export refresh function
  };
}