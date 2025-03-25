import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWalletNFTs } from '../../hooks/useWalletNFTs';
import { useMarketplace, MarketplaceOrder } from '../../hooks/useMarketplace';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import Link from 'next/link';
import { FaEthereum, FaHeart, FaShareAlt, FaSpinner, FaInfoCircle, FaUserCircle, FaClock, FaCheck, FaTimes } from 'react-icons/fa';

// GraphQL query for fetching bids
const MARKETPLACE_BIDS_QUERY = `
  query GetBidsForOrder($orderId: BigInt!) {
    marketplaceEventBidPlaceds(where: {orderId_eq: $orderId}) {
      id
      bidIndex
      bidder
      copies
      pricePerNft
      startTime
      endTime
      orderId
      blockTimestamp
      eventName
      contract
      transactionHash
    }
  }
`;

// Simple Layout component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800/80 border-b border-gray-700 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-300 text-transparent bg-clip-text">Ordinistan</h1>
          <div className="flex space-x-2">
            <Link href="/portfolio" className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white">
              My Portfolio
            </Link>
            <Link href="/explore" className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white">
              Explore
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};

// Simple toast implementation
const toast = {
  success: (message: string) => console.log(`Success: ${message}`),
  error: (message: string) => console.error(`Error: ${message}`),
  info: (message: string) => console.info(`Info: ${message}`)
};

// Helper to shorten addresses
const shortenAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Helper function to format ETH values correctly
const formatEther = (wei: string | number): string => {
  try {
    // First convert to BigInt to handle large numbers correctly
    const weiValue = BigInt(wei.toString());
    // Convert to ETH using ethers.js
    const ethValue = ethers.formatEther(weiValue);
    
    // Parse to handle trailing zeros and potential scientific notation
    const parsed = parseFloat(ethValue);
    // Format with 4 decimals max
    return parsed.toLocaleString(undefined, { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  } catch (err) {
    console.error("Error formatting ETH value:", err);
    return "0"; // Fallback value
  }
};

const NFTDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { address, isConnected } = useAccount();
  const { nfts, loading: nftsLoading, refreshNFTs } = useWalletNFTs();
  const { orders, loading: ordersLoading, error: marketplaceError, listNFT, buyNFT, cancelListing, makeOffer } = useMarketplace(id as string);

  // States for the NFT and user interactions
  const [currentNFT, setCurrentNFT] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState<MarketplaceOrder | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 100));
  
  // States for marketplace interactions
  const [isListing, setIsListing] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isMakingOffer, setIsMakingOffer] = useState(false);
  const [isAcceptingBid, setIsAcceptingBid] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [isWithdrawingBid, setIsWithdrawingBid] = useState(false);
  const [withdrawingBidId, setWithdrawingBidId] = useState<string | null>(null);
  const [isRejectingBid, setIsRejectingBid] = useState(false);
  const [rejectingBidId, setRejectingBidId] = useState<string | null>(null);
  
  // Form states
  const [listingPrice, setListingPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDuration, setOfferDuration] = useState('7'); // Default 7 days
  
  // Bids state
  const [bids, setBids] = useState<any[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  
  // UI states
  const [showListingForm, setShowListingForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add a state to track NFT sold status
  const [isSold, setIsSold] = useState(false);

  // Function to fetch bids for the current order
  const fetchBids = async (orderId: string) => {
    if (!orderId) {
      console.error("fetchBids called with empty orderId");
      return;
    }
    
    try {
      setLoadingBids(true);
      console.log("Fetching bids for order:", orderId);
      
      // Make GraphQL request to fetch bids
      const subsquidEndpoint = "http://52.64.159.183:4350/graphql";

      const orderIdForQuery = isNaN(Number(orderId)) ? orderId : Number(orderId);
      
      // First, fetch the placed bids
      const bidPlacedQuery = `
        {
          marketplaceEventBidPlaceds(where: {orderId_eq: ${orderIdForQuery}}) {
            id
            bidIndex
            bidder
            copies
            pricePerNft
            startTime
            endTime
            orderId
            blockTimestamp
            eventName
            contract
            transactionHash
          }
        }
      `;
      
      // Fetch withdrawn bids to filter them out
      const bidWithdrawnQuery = `
        {
          marketplaceEventBidWithdraws(where: {orderId_eq: ${orderIdForQuery}}) {
            transactionHash
            orderId
            id
            eventName
            contract
            blockTimestamp
            blockNumber
            bidId
          }
        }
      `;
      
      // Fetch rejected bids to mark them in the UI
      const bidRejectedQuery = `
        {
          marketplaceEventBidRejecteds(where: {orderId_eq: ${orderIdForQuery}}) {
            id
            transactionHash
            orderId
            eventName
            contract
            blockTimestamp
            blockNumber
            bidId
          }
        }
      `;
            
      const placedBidsResponse = await fetch(subsquidEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: bidPlacedQuery
        })
      });
      
      if (!placedBidsResponse.ok) {
        console.error(`Failed to fetch placed bids: ${placedBidsResponse.status} ${placedBidsResponse.statusText}`);
        const errorText = await placedBidsResponse.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch placed bids: ${placedBidsResponse.statusText}`);
      }
            
      const withdrawnBidsResponse = await fetch(subsquidEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: bidWithdrawnQuery
        })
      });
      
      if (!withdrawnBidsResponse.ok) {
        console.error(`Failed to fetch withdrawn bids: ${withdrawnBidsResponse.status} ${withdrawnBidsResponse.statusText}`);
        const errorText = await withdrawnBidsResponse.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch withdrawn bids: ${withdrawnBidsResponse.statusText}`);
      }
            
      const rejectedBidsResponse = await fetch(subsquidEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: bidRejectedQuery
        })
      });
      
      if (!rejectedBidsResponse.ok) {
        console.error(`Failed to fetch rejected bids: ${rejectedBidsResponse.status} ${rejectedBidsResponse.statusText}`);
        const errorText = await rejectedBidsResponse.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch rejected bids: ${rejectedBidsResponse.statusText}`);
      }
      
      const placedBidsResult = await placedBidsResponse.json();
      const withdrawnBidsResult = await withdrawnBidsResponse.json();
      const rejectedBidsResult = await rejectedBidsResponse.json();
      
      
      if (placedBidsResult.data && placedBidsResult.data.marketplaceEventBidPlaceds) {
        // Get the withdrawn bid IDs to filter them out completely
        const withdrawnBidIds = new Set();
        if (withdrawnBidsResult.data && withdrawnBidsResult.data.marketplaceEventBidWithdraws) {
          withdrawnBidsResult.data.marketplaceEventBidWithdraws.forEach((withdrawal: any) => {
            withdrawnBidIds.add(withdrawal.bidId);
          });
        }
        
        // Get the rejected bid IDs to mark them as rejected
        const rejectedBidIds = new Set();
        if (rejectedBidsResult.data && rejectedBidsResult.data.marketplaceEventBidRejecteds) {
          rejectedBidsResult.data.marketplaceEventBidRejecteds.forEach((rejection: any) => {
            rejectedBidIds.add(rejection.bidId);
          });
        }
        
        console.log("Withdrawn bid IDs:", Array.from(withdrawnBidIds));
        console.log("Rejected bid IDs:", Array.from(rejectedBidIds));
        
        // Filter out withdrawn bids and mark rejected bids
        const currentTime = Math.floor(Date.now() / 1000);
        const processedBids = placedBidsResult.data.marketplaceEventBidPlaceds
          .filter((bid: any) => 
            Number(bid.endTime) > currentTime && !withdrawnBidIds.has(bid.bidIndex)
          )
          .map((bid: any) => ({
            ...bid,
            isRejected: rejectedBidIds.has(bid.bidIndex)
          }));
        
        setBids(processedBids);
      } else if (placedBidsResult.errors) {
        console.error("GraphQL errors:", placedBidsResult.errors);
        setBids([]);
      } else {
        setBids([]);
      }
    } catch (err) {
      console.error("Error fetching bids:", err);
      setBids([]);
    } finally {
      setLoadingBids(false);
    }
  };

  // Add a specific function to check if an NFT's listing has completed via bid acceptance
  const checkNftSoldStatus = async (tokenId: string, orderId?: string) => {
    try {
      const subsquidEndpoint = "http://52.64.159.183:4350/graphql";
      
      // First, if we don't have an orderId, try to find it
      let orderIdToCheck = orderId;
      if (!orderIdToCheck) {
        // Query for orders with this token ID
        const tokenIdQuery = `
          query {
            marketplaceEventOrderCreateds(where: {tokenId_eq: "${tokenId}"}) {
              id
              orderId
              seller
              tokenId
            }
          }
        `;
        
        const orderResponse = await fetch(subsquidEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: tokenIdQuery
          })
        });
        
        if (orderResponse.ok) {
          const orderResult = await orderResponse.json();
          if (orderResult.data?.marketplaceEventOrderCreateds?.length > 0) {
            const relevantOrders = orderResult.data.marketplaceEventOrderCreateds;
            console.log("Found orders for this NFT ID:", relevantOrders);
            // Use the first order ID found
            orderIdToCheck = relevantOrders[0].orderId;
          }
        }
      }
      
      // If we have an order ID, check for accepted bids
      if (orderIdToCheck) {
        const bidAcceptedQuery = `
          {
            marketplaceEventBidAccepteds(where: {orderId_eq: ${orderIdToCheck}}) {
              id
              orderId
              bidId
              blockTimestamp
            }
          }
        `;
        
        const response = await fetch(subsquidEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: bidAcceptedQuery
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.data?.marketplaceEventBidAccepteds?.length > 0) {
            console.log("Found accepted bids for NFT:", result.data.marketplaceEventBidAccepteds);
            return {
              sold: true,
              acceptedBids: result.data.marketplaceEventBidAccepteds
            };
          }
        }
      }
      
      return { sold: false, acceptedBids: [] };
    } catch (err) {
      console.error("Error checking if NFT was sold:", err);
      return { sold: false, acceptedBids: [] };
    }
  };

  // Effect to find the NFT based on ID
  useEffect(() => {
    if (!id || nftsLoading) return;
    
    const checkNftStatus = async () => {
      try {
        setLoading(true);

        // Check if wallet is connected before proceeding
        if (!isConnected || !address) {
          setError('Please connect your wallet to view NFT details');
          setLoading(false);
          return;
        }

        // Find the NFT by its token ID
        const nft = nfts.find(nft => nft.tokenId === id);
        
        // Always check if this NFT has been sold via bid acceptance
        const soldStatus = await checkNftSoldStatus(id as string);
        setIsSold(soldStatus.sold);
        
        if (nft) {
          setCurrentNFT(nft);
          // Set isOwner only if the wallet address matches the NFT seller or the current address
          const ownershipCheck = address?.toLowerCase() === (nft.seller || address)?.toLowerCase();
          console.log("Ownership check:", { 
            address: address?.toLowerCase(), 
            seller: nft.seller?.toLowerCase(), 
            isOwner: ownershipCheck,
            soldStatus: soldStatus.sold
          });
          
          // If NFT was sold via bid acceptance, update owner status
          if (soldStatus.sold) {
            console.log("NFT was previously sold through bid acceptance");
            setIsOwner(false);
            setCurrentOrder(null);
            toast.info("This NFT has been sold and is no longer listed.");
          } else {
            setIsOwner(ownershipCheck);
            console.log("Found NFT in wallet:", nft);
            
            // Check if NFT is already listed in the marketplace
            if (orders && orders.length > 0) {
              const existingOrder = orders.find(order => 
                order.tokenId === id && 
                order.seller.toLowerCase() === address?.toLowerCase()
              );
              
              if (existingOrder) {
                // Use our dedicated function to check for accepted bids
                const orderSoldStatus = await checkNftSoldStatus(id as string, existingOrder.orderId);
                
                if (orderSoldStatus.sold) {
                  console.log("Found accepted bids for this order:", orderSoldStatus.acceptedBids);
                  // If there are accepted bids, the NFT is no longer listed
                  setCurrentOrder(null);
                } else {
                  setCurrentOrder(existingOrder);
                  console.log("Found listing for NFT:", existingOrder);
                  // Fetch bids for this order
                  if (existingOrder.orderId) {
                    console.log("Calling fetchBids with orderId:", existingOrder.orderId);
                    fetchBids(existingOrder.orderId);
                  }
                }
              }
            }
            
            // Important: If the NFT is marked as listed in our wallet data, we should set the currentOrder
            // even if we didn't find it in orders (which might happen due to API issues)
            if (!soldStatus.sold && nft.isListed && nft.orderId && !currentOrder) {
              // Double-check if this order has been sold
              const orderSoldStatus = await checkNftSoldStatus(id as string, nft.orderId);
              
              if (!orderSoldStatus.sold) {
                console.log("NFT is listed according to wallet data:", nft);
                // Create a minimal order object from the NFT data
                const order = {
                  orderId: nft.orderId,
                  tokenId: nft.tokenId,
                  pricePerNft: nft.price ? ethers.parseEther(nft.price.replace(' CORE', '')).toString() : '0',
                  seller: nft.seller || address || '',
                  copies: 1,
                  startTime: Math.floor(Date.now() / 1000 - 3600).toString(), // 1 hour ago as example
                  endTime: Math.floor(Date.now() / 1000 + 30 * 24 * 60 * 60).toString(), // 30 days from now
                  paymentToken: ethers.ZeroAddress,
                  nftContract: process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS || '',
                  blockTimestamp: Math.floor(Date.now() / 1000 - 3600).toString(),
                  transactionHash: '0x'
                };
                setCurrentOrder(order);
                // Fetch bids for this order
                if (nft.orderId) {
                  console.log("Calling fetchBids with NFT orderId:", nft.orderId);
                  fetchBids(nft.orderId);
                }
              } else {
                // NFT was sold but our wallet data is outdated
                console.log("NFT is marked as listed but has been sold - updating state");
                setCurrentOrder(null);
              }
            }
          }
        } else {
          // If not in user's wallet, try to get info from orders
          if (orders && orders.length > 0) {
            // Check if there are accepted bids for any of these orders
            const relevantOrder = orders[0];
            
            // Use our dedicated function to check for accepted bids
            const orderSoldStatus = await checkNftSoldStatus(id as string, relevantOrder.orderId);
            
            if (orderSoldStatus.sold) {
              console.log("Found accepted bids for this order:", orderSoldStatus.acceptedBids);
              // If there are accepted bids, the NFT is no longer listed
              setCurrentOrder(null);
              toast.info("This NFT was sold through the marketplace and is no longer listed.");
              
              // Try to fetch the current owner by querying on-chain
              if (window.ethereum) {
                try {
                  const provider = new ethers.BrowserProvider(window.ethereum);
                  const contract = new ethers.Contract(
                    process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
                    ['function ownerOf(uint256 tokenId) view returns (address)'],
                    provider
                  );
                  
                  const currentOwner = await contract.ownerOf(id);
                  console.log("Current owner of NFT:", currentOwner);
                  
                  if (currentOwner.toLowerCase() === address?.toLowerCase()) {
                    toast.success("You are now the owner of this NFT!");
                    setIsOwner(true);
                  }
                } catch (err) {
                  console.error("Error checking current owner:", err);
                }
              }
            } else {
              setCurrentOrder(relevantOrder);
              console.log("Found NFT in marketplace orders:", relevantOrder);
              // Fetch bids for this order
              if (relevantOrder.orderId) {
                console.log("Calling fetchBids with orders[0] orderId:", relevantOrder.orderId);
                fetchBids(relevantOrder.orderId);
              }
            }
            
            // We need to fetch the metadata for this token from the bridge contract
            // For now, use a placeholder and fallback image
            const fetchMetadata = async () => {
              try {
                // Create a basic NFT object first with fallbacks
                const basicNFT = {
                  tokenId: relevantOrder.tokenId,
                  name: `Ordinistan #${relevantOrder.tokenId}`,
                  image: '/placeholder-nft.jpg',
                  description: 'Bridged Bitcoin Ordinal',
                  inscriptionId: 'Unknown',
                  seller: relevantOrder.seller,
                  metadata: {
                    inscriptionId: 'Unknown',
                    contentType: 'Unknown',
                    satOrdinal: 'Unknown',
                    satRarity: 'Unknown'
                  }
                };
                
                setCurrentNFT(basicNFT);
                
                // Set isOwner flag properly, accounting for possible ownership change from accepted bids
                setIsOwner(address?.toLowerCase() === relevantOrder.seller.toLowerCase() && !orderSoldStatus.sold);
                
                // Try to fetch real metadata using ethers
                if (window.ethereum) {
                  const provider = new ethers.BrowserProvider(window.ethereum);
                  const contract = new ethers.Contract(
                    process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
                    ['function ordinalMetadata(uint256 tokenId) view returns (tuple(string, uint256, string, uint256, string, string, uint256, uint256))'],
                    provider
                  );
                  
                  try {
                    const metadata = await contract.ordinalMetadata(relevantOrder.tokenId);
                    console.log("Fetched metadata:", metadata);
                    
                    if (metadata) {
                      const inscriptionId = metadata[0] || 'Unknown';
                      const imageUrl = inscriptionId !== 'Unknown' 
                        ? `https://api.hiro.so/ordinals/v1/inscriptions/${inscriptionId}/content`
                        : '/placeholder-nft.jpg';
                        
                      const updatedNFT = {
                        ...basicNFT,
                        image: imageUrl,
                        inscriptionId: inscriptionId,
                        metadata: {
                          inscriptionId: inscriptionId,
                          inscriptionNumber: Number(metadata[1]),
                          contentType: metadata[2],
                          contentLength: Number(metadata[3]),
                          satOrdinal: metadata[4].toString(),
                          satRarity: metadata[5],
                          genesisTimestamp: Number(metadata[6]),
                          bridgeTimestamp: Number(metadata[7])
                        }
                      };
                      
                      setCurrentNFT(updatedNFT);
                    }
                  } catch (metadataErr) {
                    console.error("Failed to fetch metadata:", metadataErr);
                  }
                }
              } catch (err) {
                console.error("Error in fetchMetadata:", err);
              }
            };
            
            fetchMetadata();
          }
        }
      } catch (err: any) {
        console.error('Error finding NFT:', err);
        setError('Error loading NFT details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    checkNftStatus();
    
  }, [id, nfts, nftsLoading, orders, address, currentOrder]);

  // Check for query parameters and set initial UI state
  useEffect(() => {
    if (!router.isReady) return;
    
    const { action } = router.query;
    
    // When 'manage' action is present, the NFT should be displayed as listed
    // This helps in cases where the API call to get orders might have failed
    if (action === 'manage' && isOwner && currentNFT) {
      console.log("Manage mode active for NFT:", currentNFT.tokenId);
      
      // If not already set, make sure the NFT is shown as listed
      if (!currentOrder && !currentNFT.isListed) {
        console.log("Forcing listed status based on manage action parameter");
        // Update the currentNFT to be shown as listed
        setCurrentNFT({
          ...currentNFT,
          isListed: true,
          price: currentNFT.price || '0 CORE',
          orderId: currentNFT.orderId || `auto-${Date.now()}` // Generate a temporary ID if needed
        });
      }
    } else if (action === 'list' && isOwner && !currentOrder) {
      setShowListingForm(true);
    } else if (action === 'buy' && !isOwner && currentOrder) {
      // Perhaps auto-focus the buy button or show additional info
      console.log("Buy mode active");
    }
  }, [router.isReady, router.query, isOwner, currentOrder, currentNFT]);

  // Handle UI interactions
  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    toast.success(liked ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  // Marketplace functions
  const handleListNFT = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsListing(true);
    try {
      console.log(`Listing NFT #${currentNFT.tokenId} for ${listingPrice} CORE`);
      
      // Check if NFT is approved for marketplace first
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create bridge contract instance to check/set approval
      const bridgeContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
        ['function isApprovedForAll(address owner, address operator) view returns (bool)', 
         'function setApprovalForAll(address operator, bool approved)'],
        signer
      );
      
      // Check if marketplace is approved to handle NFTs
      const isApproved = await bridgeContract.isApprovedForAll(
        address,
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS
      );
      
      console.log("Is marketplace approved for NFTs:", isApproved);
      
      // If not approved, request approval first
      if (!isApproved) {
        toast.info('Approving marketplace to access your NFTs...');
        const approveTx = await bridgeContract.setApprovalForAll(
          process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS,
          true
        );
        await approveTx.wait();
        toast.success('Marketplace approved successfully!');
      }
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        ['function placeOrderForSell(uint256 tokenId, address nftContract, uint16 copies, uint256 pricePerNFT, address paymentToken, uint256 endTime)'],
        signer
      );
      
      // Convert price from CORE to wei
      const priceInWei = ethers.parseEther(listingPrice);
      
      // Calculate end time (current time + 30 days in seconds)
      const endTime = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      
      console.log("Listing NFT with parameters:", {
        tokenId: currentNFT.tokenId,
        nftContract: process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
        copies: 0, // ERC721
        priceInWei: priceInWei.toString(),
        paymentToken: ethers.ZeroAddress, // Native token (CORE)
        endTime
      });
      
      // Submit listing transaction
      const tx = await marketplaceContract.placeOrderForSell(
        currentNFT.tokenId,
        process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
        0, // ERC721
        priceInWei,
        ethers.ZeroAddress, // Native token (CORE)
        endTime
      );
      
      toast.info('Listing transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log('Listing transaction confirmed:', receipt);
      
      toast.success('NFT listed successfully!');
      setShowListingForm(false);
      
      // Redirect to portfolio only after confirmation
      router.push('/portfolio');
    } catch (err: any) {
      console.error('Error listing NFT:', err);
      let errorMessage = 'Transaction failed';
      
      // Extract more specific error message if available
      if (err.message) {
        if (err.message.includes('user rejected transaction')) {
          errorMessage = 'Transaction rejected by user';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas';
        } else if (err.message.includes('Invalid NFT Contract')) {
          errorMessage = 'Invalid NFT Contract. Please check approvals.';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      // Reset only the list button's loading state
      setIsListing(false);
    }
  };

  const handleBuyNFT = async () => {
    // Either use currentOrder or create one from currentNFT if available
    if (!currentOrder && !(currentNFT.isListed && currentNFT.orderId)) {
      toast.error('No active listing found for this NFT');
      return;
    }

    // Get the orderId to use
    const orderId = currentOrder?.orderId || currentNFT.orderId;
    // Get the price to use
    const priceWei = currentOrder?.pricePerNft || 
      (currentNFT.price ? ethers.parseEther(currentNFT.price.replace(' CORE', '')) : '0');

    if (!orderId || priceWei === '0') {
      toast.error('Invalid listing information');
      return;
    }

    setIsBuying(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        ['function buyNow(uint256 orderId, uint16 copies)'],
        signer
      );
      
      // Convert price to wei (already in wei format)
      console.log(`Buying NFT with orderId ${orderId} for ${ethers.formatEther(priceWei)} CORE`);
      
      // Submit buy transaction
      const tx = await marketplaceContract.buyNow(
        orderId,
        0, // ERC721 (copies = 0)
        { value: priceWei }
      );
      
      toast.info('Purchase transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log('Purchase transaction confirmed:', receipt);
      
      toast.success('NFT purchased successfully!');
      
      // Redirect to portfolio only after confirmation
      router.push('/portfolio');
    } catch (err: any) {
      console.error('Error buying NFT:', err);
      
      // Extract more specific error message if available
      let errorMessage = 'Transaction failed';
      if (err.message) {
        if (err.message.includes('user rejected transaction')) {
          errorMessage = 'Transaction rejected by user';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      // Reset only the buy button's loading state
      setIsBuying(false);
    }
  };

  const handleCancelListing = async () => {
    // Check either for currentOrder or use the NFT's orderId if available
    const orderId = currentOrder?.orderId || currentNFT?.orderId;
    
    if (!orderId) {
      toast.error('No active listing found for this NFT');
      return;
    }

    setIsCancelling(true);
    try {
      console.log(`Cancelling listing for NFT ${currentNFT.tokenId} with orderId ${orderId}`);
      
      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        ['function cancelOrder(uint256 orderId)'],
        signer
      );
      
      // Cancel the order
      const tx = await marketplaceContract.cancelOrder(orderId);
      
      // Show pending message
      toast.info('Cancellation transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      
      console.log('Cancellation transaction confirmed:', receipt);
      toast.success('Listing cancelled successfully!');
      
      // Only redirect to portfolio after transaction is confirmed
      router.push('/portfolio');
    } catch (err: any) {
      console.error('Error cancelling listing:', err);
      
      // Extract more specific error message if available
      let errorMessage = 'Transaction failed';
      if (err.message) {
        if (err.message.includes('user rejected transaction')) {
          errorMessage = 'Transaction rejected by user';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      // Reset only the cancel button's loading state
      setIsCancelling(false);
    }
  };

  // Handle accepting a bid
  const handleAcceptBid = async (orderId: string, bidIndex: string | number) => {
    console.log("Debug: Starting handleAcceptBid function");
    if (!orderId || bidIndex === undefined) {
      toast.error('Invalid bid information');
      return;
    }

    // Convert bidIndex to number if it's a string
    const bidIndexNumber = typeof bidIndex === 'string' ? Number(bidIndex) : bidIndex;
    
    // Set loading state for this specific bid
    setIsAcceptingBid(true);
    setAcceptingBidId(`${orderId}-${bidIndexNumber}`);
    
    try {
      console.log(`Accepting bid ${bidIndexNumber} for order ${orderId}`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        ['function acceptBid(uint256 orderId, uint256 bidId)'],
        signer
      );
      
      // Convert orderId to number as well for consistency
      const orderIdNumber = Number(orderId);
      
      // Accept the bid
      const tx = await marketplaceContract.acceptBid(
        orderIdNumber,
        bidIndexNumber
      );
      
      toast.info('Accept bid transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log('Accept bid transaction confirmed:', receipt);
      
      // Set the NFT as sold immediately on the UI side to prevent further interaction
      setCurrentOrder(null);
      
      toast.success('NFT has been transferred to the buyer. Transaction complete!');
      
      // After accepting a bid, the NFT is transferred and the listing should be removed
      // Refresh NFTs data first to ensure wallet state is updated
      await refreshNFTs();
      
      // For the seller: redirect to portfolio
      setTimeout(() => {
        // If this NFT was in the user's wallet and is now sold, redirect to portfolio
        if (isOwner) {
          toast.info('Redirecting to your portfolio...');
          router.push('/portfolio');
        } else {
          // If viewing someone else's NFT that was sold, just reload the page
          // to show the updated ownership information
          window.location.reload();
        }
      }, 1500);
    } catch (err: any) {
      console.error('Error accepting bid:', err);
      toast.error(err.message || 'Failed to accept bid');
    } finally {
      setIsAcceptingBid(false);
      setAcceptingBidId(null);
    }
  };

  // Handle withdrawing a bid (cancel offer)
  const handleWithdrawBid = async (orderId: string, bidIndex: string | number) => {
    console.log("Debug: Starting handleWithdrawBid function");
    if (!orderId || bidIndex === undefined) {
      toast.error('Invalid bid information');
      return;
    }

    // Convert bidIndex to number if it's a string
    const bidIndexNumber = typeof bidIndex === 'string' ? Number(bidIndex) : bidIndex;
    
    // Set loading state for this specific bid
    setIsWithdrawingBid(true);
    setWithdrawingBidId(`${orderId}-${bidIndexNumber}`);
    
    try {
      console.log(`Withdrawing bid ${bidIndexNumber} for order ${orderId}`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        ['function withdrawRejectBid(uint256 orderId, uint256 bidId, bool isReject)'],
        signer
      );
      
      // Convert orderId to number as well for consistency
      const orderIdNumber = Number(orderId);
      
      // Withdraw bid (false means it's not a rejection by seller, but a withdrawal by bidder)
      const tx = await marketplaceContract.withdrawRejectBid(
        orderIdNumber,
        bidIndexNumber,
        false // isReject = false for withdraw by bidder
      );
      
      toast.info('Withdraw bid transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log('Withdraw bid transaction confirmed:', receipt);
      
      toast.success('Bid withdrawn successfully!');
      
      // Immediately filter out the withdrawn bid from the UI
      const updatedBids = bids.filter(
        bid => !(bid.orderId === orderId && Number(bid.bidIndex) === bidIndexNumber)
      );
      setBids(updatedBids);
      
      // Then refresh from server after a delay to ensure indexer has updated
      setTimeout(() => {
        fetchBids(orderId);
      }, 3000);
    } catch (err: any) {
      console.error('Error withdrawing bid:', err);
      toast.error(err.message || 'Failed to withdraw bid');
    } finally {
      setIsWithdrawingBid(false);
      setWithdrawingBidId(null);
    }
  };

  // Handle rejecting a bid (seller rejects an offer)
  const handleRejectBid = async (orderId: string, bidIndex: string | number) => {
    console.log("Debug: Starting handleRejectBid function");
    if (!orderId || bidIndex === undefined) {
      toast.error('Invalid bid information');
      return;
    }

    // Convert bidIndex to number if it's a string
    const bidIndexNumber = typeof bidIndex === 'string' ? Number(bidIndex) : bidIndex;
    
    // Set loading state for this specific bid
    setIsRejectingBid(true);
    setRejectingBidId(`${orderId}-${bidIndexNumber}`);
    
    try {
      console.log(`Rejecting bid ${bidIndexNumber} for order ${orderId}`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        ['function withdrawRejectBid(uint256 orderId, uint256 bidId, bool isReject)'],
        signer
      );
      
      // Convert orderId to number as well for consistency
      const orderIdNumber = Number(orderId);
      
      // Reject bid (true means it's a rejection by seller)
      const tx = await marketplaceContract.withdrawRejectBid(
        orderIdNumber,
        bidIndexNumber,
        true // isReject = true for rejection by seller
      );
      
      toast.info('Reject bid transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log('Reject bid transaction confirmed:', receipt);
      
      toast.success('Bid rejected successfully!');
      
      // Update the bid in the UI to mark it as rejected
      const updatedBids = bids.map(bid => {
        if (bid.orderId === orderId && Number(bid.bidIndex) === bidIndexNumber) {
          return { ...bid, isRejected: true };
        }
        return bid;
      });
      setBids(updatedBids);
      
      // Then refresh from server after a delay to ensure indexer has updated
      setTimeout(() => {
        fetchBids(orderId);
      }, 3000);
    } catch (err: any) {
      console.error('Error rejecting bid:', err);
      toast.error(err.message || 'Failed to reject bid');
    } finally {
      setIsRejectingBid(false);
      setRejectingBidId(null);
    }
  };

  // Debug function to log bids
  useEffect(() => {
    console.log("Current bids state:", bids);
  }, [bids]);

  // Debug log for the current order
  useEffect(() => {
    if (currentOrder) {
      console.log("Current order with ID:", currentOrder.orderId);
    }
  }, [currentOrder]);

  // After the currentOrder debug, add debug for isOwner
  useEffect(() => {
    console.log("Current ownership status:", { isOwner, address });
  }, [isOwner, address]);

  // Add explicit logging after the bids are set
  useEffect(() => {
    console.log(`Bids updated: ${bids.length} bids available, isOwner: ${isOwner}`);
    if (bids.length > 0) {
      console.log("First bid details:", {
        bidder: bids[0]?.bidder,
        pricePerNft: bids[0]?.pricePerNft,
        endTime: bids[0]?.endTime,
        orderId: bids[0]?.orderId
      });
    }
  }, [bids, isOwner]);

  const handleMakeOffer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Either use currentOrder or create one from currentNFT if available
    if (!currentOrder && !(currentNFT.isListed && currentNFT.orderId)) {
      toast.error('No active listing found for this NFT');
      return;
    }

    // Get the orderId to use
    const orderId = currentOrder?.orderId || currentNFT.orderId;

    if (!orderId) {
      toast.error('Invalid listing information');
      return;
    }

    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      toast.error('Please enter a valid offer price');
      return;
    }

    setIsMakingOffer(true);
    try {
      console.log(`Making offer on NFT #${currentNFT.tokenId} for ${offerPrice} CORE with duration ${offerDuration} days`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        ['function placeOfferForOrder(uint256 orderId, uint16 copies, uint256 pricePerNFT, uint256 endTime)'],
        signer
      );
      
      // Convert price to wei
      const priceInWei = ethers.parseEther(offerPrice);
      
      // Calculate end time (current time + X days in seconds)
      const endTime = Math.floor(Date.now() / 1000) + (Number(offerDuration) * 24 * 60 * 60);
      
      // Submit offer transaction
      const tx = await marketplaceContract.placeOfferForOrder(
        orderId,
        0, // ERC721 (copies = 0)
        priceInWei,
        endTime,
        { value: priceInWei }
      );
      
      toast.info('Offer transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log('Offer transaction confirmed:', receipt);
      
      toast.success('Offer placed successfully!');
      setShowOfferForm(false);
      
      // Wait a bit longer (5s) to make sure indexer has time to update
      setTimeout(() => {
        try {
          fetchBids(orderId);
          console.log("Refreshing bids after successful offer");
        } catch (refreshErr) {
          console.error("Error refreshing bids after offer:", refreshErr);
        }
      }, 5000);
      
    } catch (err: any) {
      console.error('Error making offer:', err);
      let errorMessage = 'Transaction failed';
      
      // Extract more specific error message if available
      if (err.message) {
        if (err.message.includes('user rejected transaction')) {
          errorMessage = 'Transaction rejected by user';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      // Reset only the offer button's loading state
      setIsMakingOffer(false);
    }
  };

  // Add an effect to check for NFT updates and handle the case where an NFT view is outdated
  useEffect(() => {
    // Only run this effect when NFTs and orders are loaded
    if (nftsLoading || ordersLoading || !id || !address) return;
    
    // If we have the NFT in state but it doesn't match our address, verify it's still up to date
    if (currentNFT && currentOrder) {
      // Check if there's been a bid acceptance for this order
      checkNftSoldStatus(id as string, currentOrder.orderId).then(status => {
        if (status.sold) {
          console.log("IMPORTANT: The current NFT has been sold but UI is not updated!");
          // Force immediate UI update
          setCurrentOrder(null);
          if (isOwner) {
            toast.info("This NFT was sold. The listing is now removed.");
          } else {
            toast.info("This NFT was recently purchased by someone else.");
          }
          
          // Check if current user is the new owner
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contractPromise = new ethers.Contract(
              process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
              ['function ownerOf(uint256 tokenId) view returns (address)'],
              provider
            );
            
            contractPromise.then((contract: ethers.Contract) => {
              contract.ownerOf(id).then((ownerAddress: string) => {
                if (ownerAddress.toLowerCase() === address.toLowerCase()) {
                  // The current user is the new owner!
                  toast.success("You are the new owner of this NFT!");
                  setIsOwner(true);
                  // Refresh NFTs to update the UI
                  refreshNFTs();
                }
              }).catch((err: Error) => console.error("Error checking ownership:", err));
            }).catch((err: Error) => console.error("Error creating contract:", err));
          }
        }
      });
    }
  }, [id, currentNFT, currentOrder, nftsLoading, ordersLoading, address, refreshNFTs]);

  if (loading || nftsLoading || ordersLoading) {
  return (
      <Layout>
        <div className="flex justify-center items-center h-96">
          <FaSpinner className="animate-spin text-4xl text-purple-600" />
          <span className="ml-3 text-xl">Loading NFT details...</span>
        </div>
      </Layout>
    );
  }

  // Early check for wallet connection before any error handling
  if (!isConnected || !address) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 text-center p-4">
          <h1 className="text-2xl font-bold text-purple-500 mb-4">Wallet Not Connected</h1>
          <p className="text-gray-300">You need to connect your wallet to view NFT details.</p>
          <p className="mt-2 text-gray-400">
            Connecting your wallet allows us to verify ownership and display the correct information for this NFT.
          </p>
          <button 
            className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            onClick={() => router.push('/')}
          >
            Return to Home
          </button>
        </div>
      </Layout>
    );
  }

  if (error || !currentNFT) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 text-center p-4">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-300">{error || 'NFT not found'}</p>
          {error && error.includes('connect your wallet') ? (
            <p className="mt-2 text-gray-400">
              You need to connect your wallet to view NFT details. This allows us to verify ownership and display the correct information.
            </p>
          ) : null}
          <button 
            className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            onClick={() => error && error.includes('connect your wallet') ? 
              router.push('/') : router.push('/portfolio')
            }
          >
            {error && error.includes('connect your wallet') ? 
              'Return to Home' : 'Return to Portfolio'
            }
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* NFT Image */}
          <div className="bg-gray-800/70 rounded-xl overflow-hidden shadow-2xl p-4 border border-gray-700/50 backdrop-blur-sm hover:shadow-purple-500/10 transition-all duration-500">
            <div className="relative aspect-square rounded-xl overflow-hidden ring-2 ring-gray-700/50 shadow-inner">
                <Image
                src={currentNFT.image || '/placeholder-nft.jpg'}
                alt={currentNFT.name || 'NFT Image'}
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-nft.jpg';
                }}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
              
              {/* Show SOLD badge if NFT is sold */}
              {isSold && (
                <div className="absolute top-3 right-3 bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg transform rotate-12 z-30">
                  SOLD
              </div>
              )}
              
              {/* Display action badge based on query parameter */}
              {router.query.action && (
                <div className={`absolute top-3 left-3 
                  ${router.query.action === 'manage' ? 'bg-blue-500/90' : 
                    router.query.action === 'buy' ? 'bg-green-500/90' : 
                    router.query.action === 'list' ? 'bg-purple-500/90' : 'bg-gray-500/90'} 
                  backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-semibold`}>
                  {router.query.action === 'manage' ? 'Manage Listing' : 
                   router.query.action === 'buy' ? 'Purchase NFT' : 
                   router.query.action === 'list' ? 'List NFT' : 
                   'View NFT'}
                </div>
              )}
            </div>
              </div>
              
          {/* NFT Details */}
          <div className="bg-gray-800/70 rounded-xl shadow-2xl p-6 border border-gray-700/50 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-purple-400 to-purple-200 text-transparent bg-clip-text">
                {currentNFT.name || `Ordinal #${currentNFT.tokenId}`}
              </h1>
              <div className="flex space-x-3">
                <button 
                  onClick={handleLike}
                  className={`p-2 rounded-full ${liked ? 'bg-red-500' : 'bg-gray-700'} hover:bg-red-600 transition-colors shadow-md`}
                  aria-label="Like NFT"
                >
                  <FaHeart className="text-white" />
                </button>
                <button 
                  onClick={handleShare}
                  className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors shadow-md"
                  aria-label="Share NFT"
                >
                  <FaShareAlt className="text-white" />
                </button>
              </div>
            </div>

            {/* Owner and Creator */}
            <div className="mb-6">
              <p className="text-gray-400">Owned by</p>
              <p className="text-white font-medium">
                {isOwner ? 'You' : (currentNFT.seller || currentOrder?.seller || 'Unknown')}
              </p>
              </div>

            {/* Price and action buttons */}
            <div className="border-t border-gray-700/50 pt-6 mb-6">
              {currentOrder || (currentNFT.isListed && currentNFT.price) ? (
                <div className="mb-6">
                  <p className="text-green-500 font-medium">Listed for sale</p>
                  <div className="flex items-center">
                    <FaEthereum className="text-purple-500 text-xl mr-2" />
                    <span className="text-2xl font-bold text-white">
                      {currentOrder 
                        ? ethers.formatEther(currentOrder.pricePerNft || '0') 
                        : currentNFT.price?.replace(' CORE', '') || '0'} CORE
                    </span>
                </div>
              </div>
              ) : (
                isOwner && (
                  <div className="mb-6">
                    <p className="text-gray-400">Not listed</p>
                    <p className="text-white">This NFT is not currently for sale</p>
                  </div>
                )
              )}

              {/* Add this near the price display */}
              {isSold && (
                <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg transform rotate-12 animate-pulse">
                  SOLD
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex flex-col space-y-3">
                {isOwner ? (
                  // Owner actions
                  currentOrder || currentNFT.isListed ? (
                    !isSold && (
                      <button
                        onClick={handleCancelListing}
                        disabled={isCancelling}
                        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-md disabled:opacity-50"
                      >
                        {isCancelling ? (
                          <span className="flex items-center justify-center">
                            <FaSpinner className="animate-spin mr-2" /> Cancelling...
                          </span>
                        ) : 'Cancel Listing'}
                </button>
                    )
                  ) : (
                    !isSold && (
                      <>
                        <button
                          onClick={() => setShowListingForm(!showListingForm)}
                          className={`w-full py-3 ${showListingForm ? 'bg-gray-700' : 'bg-purple-500 hover:bg-purple-600'} text-white font-bold rounded-lg transition-all duration-300`}
                        >
                          {showListingForm ? 'Cancel' : 'List for sale'}
                        </button>
                        
                        {showListingForm && (
                          <div className="mt-4">
                            <div className="mb-2">
                              <p className="text-white font-medium mb-1">Price (CORE)</p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={listingPrice}
                                  onChange={(e) => setListingPrice(e.target.value)}
                                  className="flex-1 py-2 px-3 bg-gray-800 text-white rounded-lg outline-none border border-gray-700 focus:border-purple-500 transition-colors"
                                  placeholder="Enter price in CORE"
                                  style={{
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'textfield',
                                    appearance: 'textfield',
                                    margin: 0
                                  }}
                                />
                                <button
                                  onClick={handleListNFT}
                                  disabled={isListing || !listingPrice}
                                  className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                                >
                                  {isListing ? <FaSpinner className="animate-spin" /> : 'List'}
                </button>
              </div>
                            </div>
                            <p className="text-xs text-gray-400">
                              Setting a price will list your NFT for sale on the marketplace.
                            </p>
                          </div>
                        )}
                      </>
                    )
                  )
                ) : (
                  // Non-owner actions
                  !isSold && (currentOrder || (currentNFT.isListed && currentNFT.price)) && (
                    <>
                      <button
                        onClick={handleBuyNFT}
                        disabled={isBuying}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBuying ? (
                          <span className="flex items-center justify-center">
                            <FaSpinner className="animate-spin mr-2" /> Buying...
                          </span>
                        ) : 'Buy Now'}
                      </button>
                      
                      <button
                        onClick={() => setShowOfferForm(!showOfferForm)}
                        className={`w-full py-3 ${showOfferForm ? 'bg-gray-700' : 'bg-gray-700 hover:bg-gray-600'} text-white font-bold rounded-lg transition-colors`}
                      >
                        {showOfferForm ? 'Cancel' : 'Make Offer'}
                      </button>
                      
                      {showOfferForm && (
                        <div className="mt-4">
                          <div className="mb-2">
                            <p className="text-white font-medium mb-1">Your Offer (CORE)</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={offerPrice}
                                onChange={(e) => setOfferPrice(e.target.value)}
                                className="flex-1 py-2 px-3 bg-gray-800 text-white rounded-lg outline-none border border-gray-700 focus:border-purple-500 transition-colors"
                                placeholder="Enter your offer in CORE"
                                style={{
                                  WebkitAppearance: 'none',
                                  MozAppearance: 'textfield',
                                  appearance: 'textfield',
                                  margin: 0
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="mb-2">
                            <p className="text-white font-medium mb-1">Offer Duration (Days)</p>
                            <select
                              value={offerDuration}
                              onChange={(e) => setOfferDuration(e.target.value)}
                              className="w-full py-2 px-3 bg-gray-800 text-white rounded-lg outline-none border border-gray-700 focus:border-purple-500 transition-colors"
                            >
                              <option value="1">1 day</option>
                              <option value="3">3 days</option>
                              <option value="7">7 days</option>
                              <option value="14">14 days</option>
                              <option value="30">30 days</option>
                            </select>
                          </div>
                          
                          <button
                            onClick={handleMakeOffer}
                            disabled={isMakingOffer || !offerPrice}
                            className="w-full mt-3 px-5 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                          >
                            {isMakingOffer ? <FaSpinner className="animate-spin mx-auto" /> : 'Confirm Offer'}
                          </button>
                          
                          <p className="text-xs text-gray-400 mt-2">
                            Your offer will be sent to the NFT owner for consideration.
                          </p>
                        </div>
                      )}
                    </>
                  )
                )}
                
                {/* Show a sold message when NFT is sold */}
                {isSold && (
                  <div className="mt-4 p-4 bg-gray-800/80 rounded-lg border border-red-500/30">
                    <p className="text-center text-white">
                      This NFT has been sold and is no longer available for purchase.
                    </p>
                    <p className="text-center text-gray-400 text-sm mt-2">
                      The NFT has been transferred to the buyer&apos;s wallet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Section (replaces Description) */}
            <div className="border-t border-gray-700/50 pt-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <FaInfoCircle className="mr-2 text-purple-400" />
                Metadata
              </h2>
              
              {currentNFT.metadata ? (
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentNFT.metadata.inscriptionId && (
                  <div>
                        <p className="text-gray-400 text-sm">Inscription ID</p>
                        <p className="text-white font-medium break-all">{currentNFT.metadata.inscriptionId}</p>
                  </div>
                    )}
                    {currentNFT.metadata.inscriptionNumber !== undefined && (
                  <div>
                        <p className="text-gray-400 text-sm">Inscription Number</p>
                        <p className="text-white font-medium">{currentNFT.metadata.inscriptionNumber}</p>
                  </div>
                    )}
                    {currentNFT.metadata.contentType && (
                  <div>
                        <p className="text-gray-400 text-sm">Content Type</p>
                        <p className="text-white font-medium">{currentNFT.metadata.contentType}</p>
                  </div>
                    )}
                    {currentNFT.metadata.contentLength !== undefined && (
                  <div>
                        <p className="text-gray-400 text-sm">Content Length</p>
                        <p className="text-white font-medium">{currentNFT.metadata.contentLength} bytes</p>
                  </div>
                    )}
                    {currentNFT.metadata.satRarity && (
                      <div>
                        <p className="text-gray-400 text-sm">Sat Rarity</p>
                        <p className="text-white font-medium">{currentNFT.metadata.satRarity}</p>
                </div>
                    )}
                    {currentNFT.metadata.satOrdinal && (
                      <div>
                        <p className="text-gray-400 text-sm">Sat Ordinal</p>
                        <p className="text-white font-medium truncate">{currentNFT.metadata.satOrdinal}</p>
                      </div>
                    )}
                    {currentNFT.metadata.genesisTimestamp && (
                      <div>
                        <p className="text-gray-400 text-sm">Genesis Date</p>
                        <p className="text-white font-medium">
                          {new Date(currentNFT.metadata.genesisTimestamp * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {currentNFT.metadata.bridgeTimestamp && (
                      <div>
                        <p className="text-gray-400 text-sm">Bridge Date</p>
                        <p className="text-white font-medium">
                          {new Date(currentNFT.metadata.bridgeTimestamp * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    )}
              </div>

                  {currentNFT.metadata.inscriptionId && currentNFT.metadata.inscriptionId !== 'Unknown' && (
                <a 
                      href={`https://ordinals.com/inscription/${currentNFT.metadata.inscriptionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                      className="inline-block mt-4 text-purple-400 hover:text-purple-300 font-medium"
                >
                      View on Ordinals Explorer →
                </a>
                  )}
              </div>
              ) : (
                <p className="text-gray-300">
                  No metadata available for this NFT.
                </p>
              )}
            </div>

            {/* Bids/Offers Section */}
            {(bids.length > 0 || loadingBids) && (
              <div className="border-t border-gray-700/50 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-core-primary to-core-secondary">
                    Offers
                    {bids.length > 0 && (
                      <span className="ml-2 text-sm px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full">
                        {bids.length}
                      </span>
                    )}
                  </h2>
                  {isOwner && bids.length > 0 && (
                    <div className="text-sm text-gray-400">
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                        Active offers
                      </span>
          </div>
                  )}
        </div>

                {loadingBids ? (
                  <div className="flex justify-center items-center py-12 bg-gray-800/30 rounded-lg border border-gray-700">
                    <FaSpinner className="animate-spin text-purple-500 mr-2" />
                    <span className="text-gray-400">Loading offers...</span>
                  </div>
                ) : bids.length > 0 ? (
                  <div className="space-y-3">
                    {bids.map((bid, index) => {
                      // Calculate time remaining
                      const endTime = Number(bid.endTime);
                      const now = Math.floor(Date.now() / 1000);
                      const timeLeft = endTime - now;
                      
                      // Format time remaining
                      let timeDisplay = '';
                      if (timeLeft <= 0) {
                        timeDisplay = 'Expired';
                      } else if (timeLeft < 3600) {
                        timeDisplay = `${Math.floor(timeLeft / 60)} minutes left`;
                      } else if (timeLeft < 86400) {
                        timeDisplay = `${Math.floor(timeLeft / 3600)} hours left`;
                      } else {
                        timeDisplay = `${Math.floor(timeLeft / 86400)} days left`;
                      }
                      
                      // Check if current user is the bidder
                      const isUserBidder = address?.toLowerCase() === bid.bidder?.toLowerCase();
                      
                      return (
                        <div key={`${bid.orderId}-${bid.bidIndex}`} className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-600/50 transition-all hover:shadow-md shadow-purple-600/10">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <FaUserCircle className="text-gray-400 mr-2" />
                              <span className="text-gray-300">{shortenAddress(bid.bidder)}</span>
                              {isUserBidder && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded-full">
                                  You
                                </span>
                              )}
                              {bid.isRejected && (
                                <span className="ml-2 px-2 py-0.5 bg-red-900/50 text-red-300 text-xs rounded-full">
                                  Rejected
                                </span>
                              )}
                            </div>
                            <div className="text-gray-300 flex items-center">
                              <FaClock className="mr-1 text-xs" />
                              <span className="text-xs">{timeDisplay}</span>
                              {/* Status indicator */}
                              <span className="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <FaEthereum className="text-purple-500 mr-1" />
                              <span className="text-white font-medium">
                                {formatEther(bid.pricePerNft)} CORE
                              </span>
                            </div>
                            
                            {/* Show Accept/Reject buttons to owner if not rejected */}
                            {isOwner && !bid.isRejected ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleAcceptBid(bid.orderId, bid.bidIndex)}
                                  disabled={isAcceptingBid && acceptingBidId === `${bid.orderId}-${bid.bidIndex}`}
                                  className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-green-500/20 transition-all duration-200 disabled:opacity-50 flex items-center"
                                >
                                  {isAcceptingBid && acceptingBidId === `${bid.orderId}-${bid.bidIndex}` ? 
                                    <FaSpinner className="animate-spin" /> : (
                                    <>
                                      <FaCheck className="mr-1.5" />
                                      <span className="whitespace-nowrap">Accept</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectBid(bid.orderId, bid.bidIndex)}
                                  disabled={isRejectingBid && rejectingBidId === `${bid.orderId}-${bid.bidIndex}`}
                                  className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-red-500/20 transition-all duration-200 disabled:opacity-50 flex items-center"
                                >
                                  {isRejectingBid && rejectingBidId === `${bid.orderId}-${bid.bidIndex}` ? 
                                    <FaSpinner className="animate-spin" /> : (
                                    <>
                                      <FaTimes className="mr-1.5" />
                                      <span className="whitespace-nowrap">Reject</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : isUserBidder && !bid.isRejected ? (
                              // Only show withdraw button if bid is not rejected and user is bidder
                              <button
                                onClick={() => handleWithdrawBid(bid.orderId, bid.bidIndex)}
                                disabled={isWithdrawingBid && withdrawingBidId === `${bid.orderId}-${bid.bidIndex}`}
                                className="px-4 py-1.5 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:shadow-red-500/30 transform hover:translate-y-[-1px] transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
                              >
                                {isWithdrawingBid && withdrawingBidId === `${bid.orderId}-${bid.bidIndex}` ? 
                                  <FaSpinner className="animate-spin" /> : (
                                  <>
                                    <FaTimes className="mr-1.5" />
                                    <span className="whitespace-nowrap">Cancel Offer</span>
                                  </>
                                )}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                        <FaEthereum className="text-gray-600 text-xl" />
                      </div>
                      <p className="text-gray-300 font-medium mb-2">No active offers</p>
                      <p className="text-sm text-gray-400 max-w-md">
                        {isOwner 
                          ? "When someone makes an offer on your NFT, it will appear here for you to accept or reject."
                          : currentOrder 
                            ? "Be the first to make an offer on this NFT by clicking the 'Make Offer' button above."
                            : "This NFT is not currently listed for sale."
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Token details */}
            <div className="border-t border-gray-700/50 pt-6 mt-6">
              <h2 className="text-xl font-bold text-white mb-4">Details</h2>
              <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                <div className="flex justify-between">
                  <p className="text-gray-400">Token ID</p>
                  <p className="text-white font-medium">{currentNFT.tokenId}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-400">Contract</p>
                  <p className="text-white font-medium truncate w-48 text-right">
                    {process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS || 'Unknown'}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-400">Network</p>
                  <p className="text-white font-medium">CORE</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NFTDetailPage; 















