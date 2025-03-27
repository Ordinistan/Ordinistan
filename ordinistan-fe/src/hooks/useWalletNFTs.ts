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

// GraphQL query for transfers to capture purchased NFTs
const TRANSFERS_QUERY = `
  query GetNFTTransfers($address: String!) {
    transfers(where: {to: $address}, orderBy: blockTimestamp, orderDirection: desc) {
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

      // Use The Graph endpoint
      const graphEndpoint = process.env.NEXT_PUBLIC_GRAPH_ENDPOINT;
      if (!graphEndpoint) {
        throw new Error('Graph endpoint not configured');
      }

      // Fetch bridged ordinals
      const bridgedResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: BRIDGED_ORDINALS_QUERY,
          variables: { address: address.toLowerCase() }
        })
      });

      if (!bridgedResponse.ok) {
        throw new Error(`Failed to fetch bridged ordinals: ${bridgedResponse.statusText}`);
      }

      const bridgedResult = await bridgedResponse.json();
      const bridgedOrdinals = bridgedResult.data?.ordinalBridgeds || [];

      // Fetch actively listed orders for this address to determine which NFTs are listed
      const ACTIVE_LISTINGS_QUERY = `
        query GetActiveListings($seller: String!) {
          orderCreateds(where: {seller: $seller}) {
            id
            orderId
            tokenId
            seller
            pricePerNFT
            blockTimestamp
          }
        }
      `;

      const activeListingsResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ACTIVE_LISTINGS_QUERY,
          variables: { seller: address.toLowerCase() }
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
          orderId: listing.orderId,
          price: ethers.formatEther(listing.pricePerNFT || '0'),
          seller: listing.seller
        });
      });

      // Fetch cancelled and completed orders to exclude them
      const CANCELLED_ORDERS_QUERY = `
        query GetCancelledOrders {
          orderCancelleds {
            id
            orderId
            blockTimestamp
          }
        }
      `;

      const cancelledOrdersResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: CANCELLED_ORDERS_QUERY
        })
      });

      const cancelledOrdersResult = await cancelledOrdersResponse.json();
      const cancelledOrders = cancelledOrdersResult.data?.orderCancelleds || [];

      // Create a set of cancelled order IDs
      const cancelledOrderIds = new Set();
      cancelledOrders.forEach((order: any) => {
        cancelledOrderIds.add(order.orderId);
      });

      // Also get completed sales (either buyNow or acceptBid)
      const COMPLETED_ORDERS_QUERY = `
        query GetCompletedOrders {
          orderPurchaseds {
            id
            orderId
            blockTimestamp
            buyer
            tokenId
          }
          bidAccepteds {
            id
            orderId
            blockTimestamp
            bidId
            buyer
            tokenId
          }
        }
      `;

      const completedOrdersResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: COMPLETED_ORDERS_QUERY
        })
      });

      const completedOrdersResult = await completedOrdersResponse.json();
      const purchasedOrders = completedOrdersResult.data?.orderPurchaseds || [];
      const acceptedBids = completedOrdersResult.data?.bidAccepteds || [];

      // Create a map of sold NFTs with their buyers
      const soldNftsMap = new Map<string, string>();
      
      // Add direct purchases to the sold map
      purchasedOrders.forEach((order: any) => {
        if (order.tokenId) {
          soldNftsMap.set(order.tokenId.toString(), order.buyer);
        }
        cancelledOrderIds.add(order.orderId);
      });

      // Add accepted bids to the sold map
      acceptedBids.forEach((bid: any) => {
        if (bid.tokenId) {
          soldNftsMap.set(bid.tokenId.toString(), bid.buyer);
        }
        cancelledOrderIds.add(bid.orderId);
      });
      
      console.log("Sold NFTs map:", soldNftsMap);

      // Filter out any listings that have been cancelled or completed
      listingMap.forEach((listing, tokenId) => {
        if (cancelledOrderIds.has(listing.orderId)) {
          listingMap.delete(tokenId);
        }
      });

      // Fetch transfers to determine current ownership
      const transfersResponse = await fetch(graphEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: TRANSFERS_QUERY,
          variables: { address: address.toLowerCase() }
        })
      });

      if (!transfersResponse.ok) {
        throw new Error(`Failed to fetch transfers: ${transfersResponse.statusText}`);
      }

      const transfersResult = await transfersResponse.json();
      const transfers = transfersResult.data?.transfers || [];

      // Create a map of token IDs to their current owner
      const tokenOwnershipMap = new Map();
      
      // Sort transfers by blockTimestamp (descending) to get the latest transfer for each token
      const sortedTransfers = [...transfers].sort((a: any, b: any) => 
        Number(b.blockTimestamp) - Number(a.blockTimestamp)
      );
      
      // Only keep the latest transfer for each token
      const latestTransfers = new Map();
      sortedTransfers.forEach((transfer: any) => {
        if (!latestTransfers.has(transfer.tokenId)) {
          latestTransfers.set(transfer.tokenId, transfer);
        }
      });
      
      // Build the ownership map from latest transfers
      latestTransfers.forEach((transfer: any) => {
        tokenOwnershipMap.set(transfer.tokenId, transfer.to);
      });
      
      // Also check original bridged tokens ownership
      bridgedOrdinals.forEach((ordinal: any) => {
        if (!tokenOwnershipMap.has(ordinal.tokenId)) {
          tokenOwnershipMap.set(ordinal.tokenId, ordinal.receiver);
        }
      });
      
      // Directly check contract for ownership of all NFTs to ensure accuracy
      // This ensures we catch tokens that were bought but not indexed yet
      console.log("Current user address:", address);

      console.log("Checking on-chain ownership for all tokens...");
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const bridgeContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
        ["function ownerOf(uint256 tokenId) view returns (address)"],
        provider
      );
      
      // Store on-chain owned tokens to add to the bridgedOrdinals if needed
      const userOwnedTokens = new Set<string>();
      
      // Create a list of all known token IDs, both from bridged ordinals and transfers
      const allTokenIds = new Set<string>();
      bridgedOrdinals.forEach((ordinal: any) => {
        allTokenIds.add(ordinal.tokenId.toString());
      });
      transfers.forEach((transfer: any) => {
        allTokenIds.add(transfer.tokenId.toString());
      });
      
      // Check ownership of each token directly from the contract
      for (const tokenId of Array.from(allTokenIds)) {
        try {
          const owner = await bridgeContract.ownerOf(tokenId);
          console.log(`On-chain check: Token ${tokenId} is owned by ${owner}`);
          
          // If token is owned by the marketplace, ownership is more complex
          if (owner.toLowerCase() === process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!.toLowerCase()) {
            // Keep existing ownership info for marketplace-owned tokens
            // But we need to check if this token is part of an active order
            try {
              // Create marketplace contract
              const marketplaceContract = new ethers.Contract(
                process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
                [
                  "function order(uint256 orderId) view returns (uint256 tokenId, uint256 pricePerNFT, uint16 copies, address seller, uint256 startTime, uint256 endTime, address paymentToken, address nftContract)"
                ],
                provider
              );
              
              // We'll try a reasonable number of recent order IDs
              for (let i = 0; i < 200; i++) { // Increased to 200 to check more orders
                try {
                  const orderDetails = await marketplaceContract.order(i);
                  if (orderDetails.tokenId.toString() === tokenId) {
                    // Found an order for this token
                    console.log(`Found marketplace order for token ${tokenId}: orderId=${i}, seller=${orderDetails.seller}`);
                    
                    // Add to listing map if not already there
                    if (!listingMap.has(tokenId)) {
                      listingMap.set(tokenId, {
                        orderId: i.toString(),
                        price: ethers.formatEther(orderDetails.pricePerNFT),
                        seller: orderDetails.seller
                      });
                    }
                    
                    // CRITICAL FIX: If current user is the seller, make sure to mark this as their token
                    if (orderDetails.seller.toLowerCase() === address.toLowerCase()) {
                      console.log(`Token ${tokenId} is listed by current user with orderId ${i}, adding to userOwnedTokens`);
                      userOwnedTokens.add(tokenId);
                      
                      // Also add to the token ownership map to ensure filtering works
                      // We're setting the user as the "owner" for filtering purposes
                      tokenOwnershipMap.set(tokenId, address);
                    }
                    
                    break;
                  }
                } catch (err) {
                  // Order doesn't exist or error, continue to next
                  continue;
                }
              }
            } catch (err) {
              console.error("Error checking marketplace orders:", err);
            }
          } else {
            // For tokens not owned by marketplace, update ownership map with on-chain data
            tokenOwnershipMap.set(tokenId, owner);
          }
          
          // Special case: if the current user is the actual owner, add to ownership map and track it
          if (owner.toLowerCase() === address.toLowerCase()) {
            tokenOwnershipMap.set(tokenId, address);
            userOwnedTokens.add(tokenId);
            console.log(`Found token ${tokenId} owned by current user through on-chain check`);
          }
          
          // Also check if this token was purchased by the user according to our sold NFTs map
          if (soldNftsMap.has(tokenId) && soldNftsMap.get(tokenId)?.toLowerCase() === address.toLowerCase()) {
            console.log(`Found token ${tokenId} purchased by current user through completed orders`);
            tokenOwnershipMap.set(tokenId, address);
            userOwnedTokens.add(tokenId);
          }
        } catch (err) {
          console.error(`Error checking on-chain ownership for token ${tokenId}:`, err);
        }
      }
      
      // CRITICAL FIX: Ensure that any tokens owned by the user are included in bridgedOrdinals
      // Check if we need to add any on-chain owned tokens that aren't in bridgedOrdinals
      const existingTokenIds = new Set(bridgedOrdinals.map((ordinal: any) => ordinal.tokenId.toString()));
      const missingOwnedTokens = Array.from(userOwnedTokens).filter(tokenId => !existingTokenIds.has(tokenId));
      
      if (missingOwnedTokens.length > 0) {
        console.log(`Found ${missingOwnedTokens.length} tokens owned by user but not in bridgedOrdinals, adding them:`, missingOwnedTokens);
        
        // For each missing token, create a minimal ordinal record and add it to bridgedOrdinals
        for (const tokenId of missingOwnedTokens) {
          // Get token URI to extract metadata
          const tokenURI = await fetchTokenURI(tokenId);
          
          // Create a basic ordinal entry
          const newOrdinal = {
            id: `synthetic-${tokenId}`,
            transactionHash: "0x0",  // placeholder
            tokenId: tokenId,
            inscriptionId: tokenId, // Using tokenId as fallback
            receiver: address,
            contentURI: "",
            timestamp: "0",
            blockNumber: "0",
            blockTimestamp: "0"
          };
          
          // Add to bridgedOrdinals
          bridgedOrdinals.push(newOrdinal);
          console.log(`Added synthetic ordinal record for token ${tokenId}`);
        }
      }

      // Process bridged ordinals and create NFT objects
      const processedNfts = await Promise.all(bridgedOrdinals.map(async (ordinal: any) => {
        const tokenId = ordinal.tokenId;
        const currentOwner = tokenOwnershipMap.get(tokenId) || ordinal.receiver;
        const isOwned = currentOwner?.toLowerCase() === address.toLowerCase();
        
        // Check if this NFT is currently listed in the marketplace
        const listingInfo = listingMap.get(tokenId);
        const isListed = !!listingInfo;
        
        // Get the inscription ID and clean it
        const rawInscriptionId = ordinal.inscriptionId;
        const inscriptionId = rawInscriptionId.endsWith('i0') 
          ? rawInscriptionId 
          : `${rawInscriptionId}i0`;
        
        // Log listing info if available
        if (isListed) {
          console.log('Listing info for token', tokenId, ':', listingInfo);
        }
        
        // Fetch token URI from contract
        const tokenURI = await fetchTokenURI(tokenId);
        
        // Try to parse JSON metadata if the tokenURI is a valid JSON string
        let metadataFromURI = null;
        let imageUrl = '';
        
        if (tokenURI) {
          try {
            // If tokenURI is a base64 encoded data URI
            if (tokenURI.startsWith('data:application/json;base64,')) {
              const base64Data = tokenURI.split(',')[1];
              const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
              metadataFromURI = JSON.parse(decodedData);
              imageUrl = metadataFromURI?.image || '';
            }
            // If tokenURI is already JSON data
            else if (tokenURI.startsWith('{')) {
              metadataFromURI = JSON.parse(tokenURI);
              // Extract image URL from metadata
              imageUrl = metadataFromURI?.image || '';
              console.log('Image URL from metadata:', imageUrl);
            } 
            // If tokenURI is a URL, we need to fetch the metadata
            else {
              console.log(`TokenURI is a URL: ${tokenURI}`);
              try {
                const response = await fetch(tokenURI);
                const data = await response.json();
                metadataFromURI = data;
                imageUrl = data.image || '';
                console.log('Image URL from fetched metadata:', imageUrl);
              } catch (fetchErr) {
                console.error('Error fetching metadata from URI:', fetchErr);
                // If we can't fetch, use tokenURI as fallback if it looks like an image URL
                if (tokenURI.match(/\.(jpeg|jpg|gif|png)$/i)) {
                  imageUrl = tokenURI;
                }
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
          tokenURI: tokenURI, // Store the tokenURI in the NFT object
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

      // Filter NFTs to only show owned ones
      const ownedNfts = processedNfts.filter((nft: NFT) => {
        const currentOwner = tokenOwnershipMap.get(nft.tokenId);
        
        // Consider NFTs owned by the marketplace contract but listed by this user as "owned"
        const isUserListing = nft.isListed && nft.seller?.toLowerCase() === address.toLowerCase();
        
        // Consider marketplace NFTs with the user as seller to be owned by the user
        const listedByUser = nft.seller?.toLowerCase() === address.toLowerCase();
        
        // Check if this NFT was purchased by the user
        const purchasedByUser = soldNftsMap.has(nft.tokenId) && 
          soldNftsMap.get(nft.tokenId)?.toLowerCase() === address.toLowerCase();
        
        // If current owner is marketplace contract, respect the listing
        const isMarketplaceOwned = currentOwner?.toLowerCase() === 
          process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS?.toLowerCase();
        
        // Check if this is a token directly owned by the user (from on-chain check)
        const isDirectlyOwned = userOwnedTokens.has(nft.tokenId);
        
        // Log for debugging
        console.log(`Ownership check for ${nft.tokenId}: currentOwner=${currentOwner}, userAddress=${address}, isListed=${nft.isListed}, isUserListing=${isUserListing}, purchasedByUser=${purchasedByUser}, isDirectlyOwned=${isDirectlyOwned}, listedByUser=${listedByUser}`);
        
        // CRITICAL FIX: Force include NFTs where the user is the seller, regardless of other conditions
        if (listedByUser) {
            console.log(`Token ${nft.tokenId} is forcibly included because user is the seller`);
            return true;
        }
        
        // NFT is considered owned if:
        // 1. The user directly owns it according to the ownership map
        // 2. There's no owner info but we're including it anyway (fallback)
        // 3. The NFT is listed by this user (even though marketplace contract owns it)
        // 4. The NFT was purchased by this user
        // 5. The NFT is directly owned by the user according to the blockchain
        return (
          currentOwner?.toLowerCase() === address.toLowerCase() || 
          (!currentOwner && !isMarketplaceOwned) || 
          (isMarketplaceOwned && listedByUser) ||
          purchasedByUser ||
          isDirectlyOwned
        );
      });

      console.log("Total owned NFTs:", ownedNfts.length);
      
      // Enhanced logging for NFT state
      ownedNfts.forEach((nft) => {
        console.log(`NFT ${nft.tokenId}: isListed=${nft.isListed}, orderId=${nft.orderId || 'none'}, seller=${nft.seller || 'none'}`);
      });
      
      // Separate into listed and unlisted NFTs
      const listed = ownedNfts.filter((nft: NFT) => {
        // CRITICAL FIX: Consider NFTs listed if either:
        // 1. They have the isListed flag, OR
        // 2. The seller field matches the current user (these are definitely listed)
        return nft.isListed || (nft.seller?.toLowerCase() === address.toLowerCase());
      });
      
      // Make sure all NFTs in the listed array have the isListed flag
      listed.forEach(nft => {
        if (!nft.isListed) {
          nft.isListed = true;
        }
      });
      
      const unlisted = ownedNfts.filter((nft: NFT) => {
        // Only include in unlisted if:
        // 1. It's not marked as listed AND
        // 2. The user is not the seller
        return !nft.isListed && nft.seller?.toLowerCase() !== address.toLowerCase();
      });

      console.log("Listed NFTs:", listed.length);
      console.log("Unlisted NFTs:", unlisted.length);

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