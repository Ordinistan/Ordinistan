import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useWalletNFTs, NFT } from "../../hooks/useWalletNFTs";
import { useMarketplace, MarketplaceOrder } from "../../hooks/useMarketplace";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import Image from "next/image";
import Link from "next/link";
import { FaEthereum, FaHeart, FaShareAlt, FaSpinner, FaInfoCircle, FaUserCircle, FaClock, FaCheck, FaTimes } from "react-icons/fa";

// GraphQL query for fetching bids
const MARKETPLACE_BIDS_QUERY = `
  query GetBidsForOrder($orderId: String!) {
    bidPlaceds(where: {orderId: $orderId}) {
      id
      orderId
      bidder
      copies
      pricePerNFT
      startTime
      endTime
      blockTimestamp
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
  info: (message: string) => console.info(`Info: ${message}`),
};

// Helper to shorten addresses
const shortenAddress = (address: string): string => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Helper function to safely format ETH values that may be in different formats
const safeFormatEther = (value: string | number | undefined): string => {
  if (!value) return '0';
  
  try {
    // If it's already a decimal string (contains a period), just return it
    if (typeof value === 'string' && value.includes('.')) {
      return value;
    }
    
    // Otherwise, convert using ethers.formatEther
    return ethers.formatEther(value.toString());
  } catch (err) {
    console.error('Error formatting ETH value:', err);
    return '0'; // Fallback value
  }
};

// Add helper function to create MarketplaceOrder objects correctly
const createOrderObject = (
  orderId: string,
  tokenId: string,
  price: string,
  seller: string
): MarketplaceOrder => {
  return {
    orderId,
    tokenId,
    pricePerNFT: price, // Note: using pricePerNFT to match MarketplaceOrder interface
    seller,
    copies: 1,
    startTime: Math.floor(Date.now() / 1000 - 3600).toString(),
    endTime: Math.floor(Date.now() / 1000 + 30 * 24 * 60 * 60).toString(),
    paymentToken: ethers.ZeroAddress,
    nftContract: process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS || '',
    blockTimestamp: Math.floor(Date.now() / 1000 - 3600).toString(),
    transactionHash: '0x'
  };
};

// Helper function for type-safe ID access
const getSafeId = (id: string | string[] | undefined): string => {
  if (!id) return "";
  return Array.isArray(id) ? id[0] : id;
};

// Update the checkDirectFromContract to receive the necessary functions and state variables
const checkDirectFromContract = async (
  tokenId: string,
  currentAddress: string | undefined,
  setNFT: React.Dispatch<React.SetStateAction<NFT | null>>,
  setOwner: React.Dispatch<React.SetStateAction<boolean>>,
  setOrder: React.Dispatch<React.SetStateAction<MarketplaceOrder | null>>,
  setErr: React.Dispatch<React.SetStateAction<string | null>>,
  fetchOrderBids: (orderId: string) => Promise<void>
): Promise<NFT | null> => {
  try {
    console.log("Checking NFT directly from contract with tokenId:", tokenId);
    if (!window.ethereum) {
      console.error("No ethereum provider found");
      return null;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Create contract instance for Bridge NFT
    const bridgeContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
      [
        "function tokenURI(uint256 tokenId) view returns (string)",
        "function ownerOf(uint256 tokenId) view returns (address)"
      ],
      provider
    );
    
    // Create contract instance for Marketplace
    const marketplaceContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
      [
        "function order(uint256 orderId) view returns (uint256 tokenId, uint256 pricePerNFT, uint16 copies, address seller, uint256 startTime, uint256 endTime, address paymentToken, address nftContract)"
      ],
      provider
    );

    // First check if token exists by trying to get its owner
    let owner;
    try {
      owner = await bridgeContract.ownerOf(tokenId);
      console.log("NFT owner:", owner);
    } catch (err) {
      console.log("Failed to get owner, NFT may not exist:", err);
      return null;
    }
    
    // If owner is marketplace contract, check if there's an active order
    let isListed = false;
    let orderId = undefined;
    let price = undefined;
    let seller = undefined;
    
    if (owner.toLowerCase() === process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!.toLowerCase()) {
      console.log("NFT is owned by marketplace, checking for active orders");
      
      // Search for active orders in subgraph (we'd need to implement this)
      // For now, simple approach - check all potential orderIds for this token
      // This is a temporary solution until we have proper subgraph query
      for (let i = 0; i < 100; i++) {
        try {
          const orderDetails = await marketplaceContract.order(i);
          if (orderDetails.tokenId.toString() === tokenId &&
              orderDetails.seller !== ethers.ZeroAddress) {
            isListed = true;
            
            // Store orderId in both decimal and hex format
            // Keep decimal for contract interactions
            orderId = i.toString();
            price = ethers.formatEther(orderDetails.pricePerNFT);
            seller = orderDetails.seller;
            console.log("Found active order:", {orderId, price, seller});
            break;
          }
        } catch (err) {
          // Order doesn't exist or error
          continue;
        }
      }
    } else {
      // NFT is owned by a regular address
      console.log("NFT is owned by regular address:", owner);
    }
    
    // Fetch tokenURI to get metadata
    let tokenURI;
    try {
      tokenURI = await bridgeContract.tokenURI(tokenId);
      console.log("Token URI:", tokenURI);
    } catch (err) {
      console.log("Failed to get tokenURI:", err);
      // Continue - we might still want to show basic NFT info
    }
    
    // Parse metadata if available
    let name = `Ordinistan #${tokenId}`;
    let description = "Bridged Bitcoin Ordinal";
    let imageUrl = "/placeholder-nft.jpg";
    let inscriptionId = "Unknown";
    let parsedMetadata: any = null;
    
    if (tokenURI) {
      try {
        // If tokenURI is base64 encoded
        if (tokenURI.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.split(',')[1];
          const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
          parsedMetadata = JSON.parse(decodedData);
        } 
        // If tokenURI is already JSON
        else if (tokenURI.startsWith('{')) {
          parsedMetadata = JSON.parse(tokenURI);
        }
        // If tokenURI is a URL
        else {
          try {
            const response = await fetch(tokenURI);
            parsedMetadata = await response.json();
          } catch (err) {
            console.log("Error fetching metadata from URI:", err);
          }
        }
        
        if (parsedMetadata) {
          name = parsedMetadata.name || name;
          description = parsedMetadata.description || description;
          imageUrl = parsedMetadata.image || imageUrl;
          
          // Extract inscription ID if available
          if (parsedMetadata.attributes && Array.isArray(parsedMetadata.attributes)) {
            const inscriptionAttr = parsedMetadata.attributes.find(
              (attr: any) => attr.trait_type === 'Inscription ID'
            );
            inscriptionId = inscriptionAttr?.value || inscriptionId;
          }
        }
      } catch (err) {
        console.log("Error parsing tokenURI:", err);
      }
    }
    
    // Create NFT object with all required metadata fields
    const constructedNft: NFT = {
      tokenId,
      name,
      description,
      image: imageUrl,
      isListed,
      orderId,
      price: price ? `${price} CORE` : undefined,
      seller,
      metadata: {
        inscriptionId,
        contentType: "Unknown",
        satOrdinal: "Unknown",
        satRarity: "Unknown",
        inscriptionNumber: 0,
        contentLength: 0,
        genesisTimestamp: 0,
        bridgeTimestamp: 0
      }
    };
    
    // Update component state with the found NFT
    if (constructedNft) {
      // Use the passed setter functions
      setNFT(constructedNft);
      
      // Check if current wallet is the owner
      const isCurrentUserOwner = currentAddress?.toLowerCase() === 
        (owner.toLowerCase() === process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!.toLowerCase() 
          ? seller?.toLowerCase() 
          : owner.toLowerCase());
          
      setOwner(isCurrentUserOwner);
      
      // If listed, set current order
      if (isListed && orderId) {
        const order = createOrderObject(
          orderId,
          constructedNft.tokenId,
          price || "0",
          seller || ""
        );
        setOrder(order);
        
        // Fetch bids for this order
        fetchOrderBids(orderId);
      } else {
        setOrder(null);
      }
    }
    
    return constructedNft;
  } catch (error) {
    console.error("Error checking NFT from contract:", error);
    setErr("Failed to load NFT details from blockchain");
    return null;
  }
};

// Fix the getListingStatus function
const getListingStatus = (order: MarketplaceOrder | null): { sold: boolean; buyer: string | null; timestamp: number | null } => {
  if (!order) return { sold: false, buyer: null, timestamp: null };
  
  // Check if order was sold - for now this returns a default value
  // This would need to be implemented based on your subgraph data
  return { sold: false, buyer: null, timestamp: null };
};

const NFTDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { address, isConnected } = useAccount();
  const { listedNFTs, unlistedNFTs, loading: nftsLoading, refreshNFTs } = useWalletNFTs();
  const { orders, loading: ordersLoading, error: marketplaceError, listNFT, buyNFT, cancelListing, makeOffer } = useMarketplace(id as string);

  // Combine the NFTs arrays for searching
  const nfts = [...listedNFTs, ...unlistedNFTs];

  // States for the NFT and user interactions
  const [currentNFT, setCurrentNFT] = useState<NFT | null>(null);
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
  const [listingPrice, setListingPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerDuration, setOfferDuration] = useState("7"); // Default 7 days
  
  // Bids state
  const [bids, setBids] = useState<any[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  
  // UI states
  const [showListingForm, setShowListingForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [managingMode, setManagingMode] = useState(false);
  const [listingMode, setListingMode] = useState(false);
  const [buyingMode, setBuyingMode] = useState(false);

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
      
      // Use The Graph endpoint
      const graphEndpoint = process.env.NEXT_PUBLIC_GRAPH_ENDPOINT;
      if (!graphEndpoint) {
        throw new Error('Graph endpoint not configured');
      }
      
      // Convert orderId to decimal for GraphQL query if it's in hex
      let orderIdForQuery = orderId;
      if (typeof orderId === 'string' && orderId.startsWith('0x')) {
        // Convert from hex to decimal
        orderIdForQuery = parseInt(orderId, 16).toString();
        console.log("Converting hex orderId to decimal for GraphQL query:", orderIdForQuery);
      }
      
      // Create hex-formatted orderId with proper padding for Bytes encoding
      // The subgraph expects a properly formatted bytes32 hex string
      const paddedOrderId = (typeof orderIdForQuery === 'string' && orderIdForQuery.startsWith('0x'))
        ? orderIdForQuery.padEnd(66, '0') // Already hex, just pad
        : '0x' + Number(orderIdForQuery).toString(16).padStart(64, '0'); // Convert to hex and pad
      
      console.log("Using properly formatted orderId for GraphQL:", paddedOrderId);
      
      // First, fetch the placed bids
      const response = await fetch(graphEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: MARKETPLACE_BIDS_QUERY,
          variables: { orderId: paddedOrderId }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch placed bids: ${response.statusText}`);
      }

      // Fetch withdrawn bids to filter them out
      const WITHDRAWN_BIDS_QUERY = `
        query GetWithdrawnBids($orderId: String!) {
          bidWithdraws(where: {orderId: $orderId}) {
            id
            orderId
            blockTimestamp
            transactionHash
          }
        }
      `;
      
      const withdrawnBidsResponse = await fetch(graphEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: WITHDRAWN_BIDS_QUERY,
          variables: { orderId: paddedOrderId }
        }),
      });

      if (!withdrawnBidsResponse.ok) {
        throw new Error(`Failed to fetch withdrawn bids: ${withdrawnBidsResponse.statusText}`);
      }
      
      // Fetch rejected bids to mark them in the UI
      const REJECTED_BIDS_QUERY = `
        query GetRejectedBids($orderId: String!) {
          bidRejecteds(where: {orderId: $orderId}) {
            id
            orderId
            bidId
            blockTimestamp
            transactionHash
          }
        }
      `;

      const rejectedBidsResponse = await fetch(graphEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: REJECTED_BIDS_QUERY,
          variables: { orderId: paddedOrderId }
        }),
      });
      
      if (!rejectedBidsResponse.ok) {
        throw new Error(`Failed to fetch rejected bids: ${rejectedBidsResponse.statusText}`);
      }
      
      const placedBidsResult = await response.json();
      const withdrawnBidsResult = await withdrawnBidsResponse.json();
      const rejectedBidsResult = await rejectedBidsResponse.json();
      
      // Check for GraphQL errors and handle them gracefully
      if (placedBidsResult.errors) {
        // Log once instead of repeatedly
        console.error("GraphQL error in fetchBids:", placedBidsResult.errors[0]?.message || "Unknown GraphQL error");
        setBids([]);
        return;
      }
      
      if (placedBidsResult.data && placedBidsResult.data.bidPlaceds) {
        // Get the withdrawn bid IDs to filter them out completely
        const withdrawnBidIds = new Set();
        if (withdrawnBidsResult.data && withdrawnBidsResult.data.bidWithdraws) {
          withdrawnBidsResult.data.bidWithdraws.forEach((withdrawal: any) => {
            withdrawnBidIds.add(withdrawal.id);
          });
        }
        
        // Get the rejected bid IDs to mark them as rejected
        const rejectedBidIds = new Set();
        if (rejectedBidsResult.data && rejectedBidsResult.data.bidRejecteds) {
          rejectedBidsResult.data.bidRejecteds.forEach((rejection: any) => {
            rejectedBidIds.add(rejection.bidId);
          });
        }
        
        // Filter out withdrawn bids and mark rejected bids
        const currentTime = Math.floor(Date.now() / 1000);
        const processedBids = placedBidsResult.data.bidPlaceds
          .filter((bid: any) => Number(bid.endTime) > currentTime && !withdrawnBidIds.has(bid.id))
          .map((bid: any) => ({
            ...bid,
            // Use bid.id as the bidId for operations since it's a unique identifier
            bidId: bid.id,
            isRejected: rejectedBidIds.has(bid.id),
          }));
        
        setBids(processedBids);
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

  // Update function with type-safe id usage and hex orderId handling
  const checkNftSoldStatus = async (tokenId: string, orderId: string): Promise<{ sold: boolean; buyer: string | null; timestamp: number | null }> => {
    // Convert orderId to decimal for GraphQL query if it's in hex
    let orderIdForQuery = orderId;
    if (typeof orderId === 'string' && orderId.startsWith('0x')) {
      // Convert from hex to decimal
      orderIdForQuery = parseInt(orderId, 16).toString();
      console.log("Converting hex orderId to decimal for sold status check:", orderIdForQuery);
    }
    
    // Create hex-formatted orderId with proper padding for Bytes encoding
    // The subgraph expects a properly formatted bytes32 hex string
    const paddedOrderId = (typeof orderIdForQuery === 'string' && orderIdForQuery.startsWith('0x'))
      ? orderIdForQuery.padEnd(66, '0') // Already hex, just pad
      : '0x' + Number(orderIdForQuery).toString(16).padStart(64, '0'); // Convert to hex and pad
    
    console.log("Using properly formatted orderId for sold status check:", paddedOrderId);
    
    // Create GraphQL query to check if this order ID was purchased or has an accepted bid
    const COMPLETED_ORDER_QUERY = `
      query GetCompletedOrder($orderId: String!) {
        orderPurchaseds(where: {orderId: $orderId}) {
          id
          buyer
          blockTimestamp
        }
        bidAccepteds(where: {orderId: $orderId}) {
          id
              bidId
              blockTimestamp
            }
          }
        `;
        
    try {
      const graphEndpoint = process.env.NEXT_PUBLIC_GRAPH_ENDPOINT;
      if (!graphEndpoint) {
        throw new Error('Graph endpoint not configured');
      }

      // Execute the query
      const response = await fetch(graphEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          query: COMPLETED_ORDER_QUERY,
          variables: { orderId: paddedOrderId }
          })
        });
        
          const result = await response.json();
      
      // Handle GraphQL errors
      if (result.errors) {
        console.error("GraphQL error in checkNftSoldStatus:", result.errors[0]?.message);
        return { sold: false, buyer: null, timestamp: null };
      }
      
      // Check if there are any purchase or accept events for this order
      const purchases = result.data?.orderPurchaseds || [];
      const acceptedBids = result.data?.bidAccepteds || [];
      
      if (purchases.length > 0) {
        // Order was purchased directly
        const purchase = purchases[0];
            return {
              sold: true,
          buyer: purchase.buyer,
          timestamp: parseInt(purchase.blockTimestamp)
        };
      } else if (acceptedBids.length > 0) {
        // A bid was accepted for this order
        const acceptedBid = acceptedBids[0];
        
        // We need to find the bidder - for now simplifying with unknown
        return {
          sold: true,
          buyer: "Unknown", // Would need another query to find the actual bidder
          timestamp: parseInt(acceptedBid.blockTimestamp)
        };
      }
      
      return { sold: false, buyer: null, timestamp: null };
    } catch (err) {
      console.error("Error checking if NFT was sold:", err);
      return { sold: false, buyer: null, timestamp: null };
    }
  };

  // Add an effect to check for NFT updates and handle the case where an NFT view is outdated
  useEffect(() => {
    // Only run this effect when NFTs and orders are loaded
    if (nftsLoading || ordersLoading || !id || !address || !currentNFT || !currentOrder) return;
    
    // Check if there's been a bid acceptance for this order only once when the component loads
    const checkOrderStatus = async () => {
      try {
        const status = await checkNftSoldStatus(getSafeId(id), currentOrder.orderId);
        if (status.sold) {
          console.log(`NFT ${id} has been sold but UI is not updated`);
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
            const bridgeContract = new ethers.Contract(
              process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!, 
              ["function ownerOf(uint256 tokenId) view returns (address)"], 
              provider
            );
            
            try {
              const currentId = getSafeId(id);
              const ownerAddress = await bridgeContract.ownerOf(currentId);
              
              if (ownerAddress.toLowerCase() === address.toLowerCase()) {
                // The current user is the new owner!
                toast.success("You are the new owner of this NFT!");
                setIsOwner(true);
                // Refresh NFTs to update the UI
                refreshNFTs();
              }
            } catch (err) {
              console.error("Error checking ownership:", err);
            }
          }
        }
      } catch (err) {
        console.error("Error checking NFT sold status:", err);
      }
    };
    
    // Only run once when component mounts or when order/NFT changes
    checkOrderStatus();
    
    // Don't add checkOrderStatus to deps as it would cause an infinite loop
  }, [id, currentNFT, currentOrder, nftsLoading, ordersLoading, address, isOwner, refreshNFTs]);
  
  // Update the main effect's dependency array
  useEffect(() => {
    if (!id || !address) return;
    
    const currentId = getSafeId(id);
    console.log("Running NFT detail effect for ID:", currentId);
    
    let isMounted = true;
    
    const checkNfts = async () => {
      try {
        if (!isConnected || !window.ethereum) {
          if (isMounted) {
            setError("Please connect your wallet to view NFT details");
          setLoading(false);
          }
          return;
        }

        // First try to find the NFT in user's wallet NFTs (both listed and unlisted)
        let nft = unlistedNFTs.find(n => n.tokenId === currentId);
        
        // If not found in unlisted, check listed NFTs
        if (!nft) {
          nft = listedNFTs.find(n => n.tokenId === currentId);
        }
        
        // Create provider for contract interactions
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // If we found the NFT in the wallet
        if (nft && isMounted) {
          console.log("Found NFT in user's wallet:", nft.tokenId);

          // Create marketplace contract
          const marketplaceContract = new ethers.Contract(
            process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
            [
              "function order(uint256 orderId) view returns (uint256 tokenId, uint256 pricePerNFT, uint16 copies, address seller, uint256 startTime, uint256 endTime, address paymentToken, address nftContract)"
            ],
            provider
          );
          
          // If the NFT is marked as listed in our UI, let's verify with the contract
          if (nft.isListed && nft.orderId) {
            let orderExistsInContract = false;
            
            try {
              console.log("Verifying listing status in contract for orderId:", nft.orderId);
              
              // Convert orderId to number format if it's in hex
              let normalizedOrderId = nft.orderId;
              if (typeof normalizedOrderId === 'string' && normalizedOrderId.startsWith('0x')) {
                normalizedOrderId = parseInt(normalizedOrderId, 16).toString();
                console.log("Converted hex orderId to decimal:", normalizedOrderId);
              }
              
              const orderDetails = await marketplaceContract.order(normalizedOrderId);
              
              // Check if order exists (non-zero seller address) and matches this NFT
              if (orderDetails.seller !== ethers.ZeroAddress && 
                  orderDetails.tokenId.toString() === nft.tokenId) {
                orderExistsInContract = true;
                console.log("Confirmed: NFT is currently listed in contract");
                } else {
                console.log("NFT marked as listed in UI but not listed in contract.");
              }
            } catch (orderErr: any) {
              console.log("Error verifying order status:", orderErr.message);
            }
            
            // If the UI says it's listed but the contract says it's not,
            // update our nft object
            if (!orderExistsInContract) {
              console.log("Fixing inconsistency: NFT is not actually listed");
              nft = {
                ...nft,
                isListed: false,
                orderId: undefined,
                price: undefined
              };
            }
          }
          
          setCurrentNFT(nft);
          
          // Set isOwner based on ownership check
          const ownershipCheck = address?.toLowerCase() === (nft.seller || address)?.toLowerCase();
          setIsOwner(ownershipCheck);
          
          // Check if NFT was sold (if it was previously listed)
          const soldStatus = { sold: false, buyer: null, timestamp: null };
          if (nft.orderId) {
            const checkResult = await checkNftSoldStatus(currentId, nft.orderId);
            if (checkResult.sold) {
              soldStatus.sold = true;
            }
          }
          
          // If NFT is listed and order exists in contract, set up the order information
          if (nft.isListed) {
            if (nft.orderId) {
              // Create order object from NFT data
              const order = createOrderObject(
                nft.orderId,
                nft.tokenId,
                nft.price ? nft.price.replace(" CORE", "") : "0",
                nft.seller || address || ""
              );
                setCurrentOrder(order);
              
                // Fetch bids for this order
                  fetchBids(nft.orderId);
            } else if (orders && orders.length > 0) {
              // Try to find matching order in the orders array
              const existingOrder = orders.find(order => order.tokenId === currentId);
              if (existingOrder) {
                setCurrentOrder(existingOrder);
                fetchBids(existingOrder.orderId);
              }
                }
              } else {
            // NFT is not listed
                setCurrentOrder(null);
              }
            }
        // If not found in wallet, check marketplace orders
        else if (orders && orders.length > 0 && isMounted) {
          const relevantOrder = orders.find(order => order.tokenId === currentId);
          
          if (relevantOrder) {
            // Verify with contract that the order is real
            let orderExistsInContract = false;
            try {
              const marketplaceContract = new ethers.Contract(
                process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
                [
                  "function order(uint256 orderId) view returns (uint256 tokenId, uint256 pricePerNFT, uint16 copies, address seller, uint256 startTime, uint256 endTime, address paymentToken, address nftContract)"
                ],
                    provider
                  );
                  
              const orderDetails = await marketplaceContract.order(relevantOrder.orderId);
              if (orderDetails.seller !== ethers.ZeroAddress && 
                  orderDetails.tokenId.toString() === currentId) {
                orderExistsInContract = true;
              }
            } catch (orderErr: any) {
              console.log("Error verifying marketplace order:", orderErr.message);
            }
            
            if (!orderExistsInContract) {
              console.log("Order doesn't exist in contract, checking directly from chain");
              if (isMounted) {
                await checkDirectFromContract(
                  currentId, 
                  address, 
                  setCurrentNFT, 
                  setIsOwner, 
                  setCurrentOrder, 
                  setError, 
                  fetchBids
                );
              }
              return;
            }
            
            // Check if order was sold
            const orderSoldStatus = await checkNftSoldStatus(currentId, relevantOrder.orderId);
            
            if (orderSoldStatus.sold && isMounted) {
              setCurrentOrder(null);
            } else if (isMounted) {
              setCurrentOrder(relevantOrder);
                fetchBids(relevantOrder.orderId);

              // Create a basic NFT object
                const basicNFT = {
                  tokenId: relevantOrder.tokenId,
                  name: `Ordinistan #${relevantOrder.tokenId}`,
                image: "/placeholder-nft.jpg", 
                description: "Bridged Bitcoin Ordinal",
                inscriptionId: "Unknown",
                  seller: relevantOrder.seller,
                isListed: true, // Mark as listed since it has an active order
                orderId: relevantOrder.orderId, // Add orderId to prevent UI inconsistency
                price: `${safeFormatEther(relevantOrder.pricePerNFT)} CORE`, // Add price for consistency
                  metadata: {
                  inscriptionId: "Unknown",
                  contentType: "Unknown",
                  satOrdinal: "Unknown",
                  satRarity: "Unknown",
                  inscriptionNumber: 0,
                  contentLength: 0,
                  genesisTimestamp: 0,
                  bridgeTimestamp: 0
                },
                };
                
                setCurrentNFT(basicNFT);
              setIsOwner(address?.toLowerCase() === relevantOrder.seller.toLowerCase());
            }
          } 
          // Not found in orders - try direct contract lookup
          else if (isMounted) {
            await checkDirectFromContract(
              currentId, 
              address, 
              setCurrentNFT, 
              setIsOwner, 
              setCurrentOrder, 
              setError, 
              fetchBids
            );
          }
        } 
        // Last resort - check directly on blockchain
        else if (isMounted) {
          await checkDirectFromContract(
            currentId, 
            address, 
            setCurrentNFT, 
            setIsOwner, 
            setCurrentOrder, 
            setError, 
            fetchBids
          );
        }
      } catch (err: any) {
        console.error("Error finding NFT:", err);
        if (isMounted) {
          setError("Error loading NFT details. Please try again.");
        }
      } finally {
        if (isMounted) {
        setLoading(false);
        }
      }
    };
    
    checkNfts();
    
    return () => {
      isMounted = false;
    };
  }, [id, address, isConnected, listedNFTs, unlistedNFTs, orders]);

  // Debug logging: Reduce excessive logging by removing unnecessary console.log statements
  // Only log the current bids state once when it changes
  useEffect(() => {
    if (bids.length > 0) {
      console.log(`NFT ${id}: ${bids.length} active bids available`);
    }
  }, [bids, id]);

  // Fix the handleListNFT function to properly handle the placeOrderForSell call
  const handleListNFT = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!listingPrice || parseFloat(listingPrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    
    if (!currentNFT) {
      toast.error("NFT data not available");
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
        ["function isApprovedForAll(address owner, address operator) view returns (bool)", "function setApprovalForAll(address operator, bool approved)"],
        signer
      );
      
      // Check if marketplace is approved to handle NFTs
      const isApproved = await bridgeContract.isApprovedForAll(address, process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS);
      
      console.log("Is marketplace approved for NFTs:", isApproved);
      
      // If not approved, request approval first
      if (!isApproved) {
        toast.info("Approving marketplace to access your NFTs...");
        const approveTx = await bridgeContract.setApprovalForAll(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS, true);
        await approveTx.wait();
        toast.success("Marketplace approved successfully!");
      }
      
      // Convert price from CORE to wei
      const priceInWei = ethers.parseEther(listingPrice);
      
      // Calculate end time (current time + 30 days in seconds)
      const endTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        ["function placeOrderForSell(uint256 tokenId, address nftContract, uint16 copies, uint256 pricePerNFT, address paymentToken, uint256 endTime)"],
        signer
      );
      
      // Submit listing transaction - fix parameter order if needed based on contract implementation
      const tx = await marketplaceContract.placeOrderForSell(
        currentNFT.tokenId,
        process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
        0, // ERC721
        priceInWei,
        ethers.ZeroAddress, // Native token (CORE)
        endTime
      );
      
      toast.info("Listing transaction submitted. Waiting for confirmation...");
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log("Listing transaction confirmed:", receipt);
      
      // Try to extract orderId from logs if possible
      let orderId: string | undefined;
      try {
        // Find the OrderCreated event and extract orderId
        const OrderCreatedEvent = receipt.logs
          ?.filter((log: any) => log.topics[0] === "0x7b18a2f74f1f95529ecb2f6da83a3eb5ec97c0c56f1b8715d7a06ef620d67e50")
          ?.map((log: any) => marketplaceContract.interface.parseLog(log))[0];
        
        if (OrderCreatedEvent && OrderCreatedEvent.args) {
          orderId = OrderCreatedEvent.args.orderId?.toString();
          console.log("Successfully extracted orderId from logs:", orderId);
        }
      } catch (err) {
        console.log("Could not extract orderId from logs:", err);
      }
      
      // Update local state immediately without waiting for subgraph
      // This ensures UI reflects the listing even if the subgraph is delayed
      if (currentNFT) {
        // Force update the current NFT status
        setCurrentNFT({
          ...currentNFT,
          isListed: true,
          orderId: orderId || "pending", // Use extracted orderId or "pending"
          price: `${listingPrice} CORE`,
          seller: address || ""
        });
        
        // Create and set current order state
        const orderObject = createOrderObject(
          orderId || "pending",
          currentNFT.tokenId,
          listingPrice,
          address || ""
        );
        setCurrentOrder(orderObject);
      }
      
      toast.success("NFT listed successfully!");
      setShowListingForm(false);
      
      // Refresh NFTs to update the UI more completely
      await refreshNFTs();
      
      // Redirect to portfolio only after confirmation
      router.push("/portfolio");
    } catch (err: any) {
      console.error("Error listing NFT:", err);
      let errorMessage = "Transaction failed";
      
      // Extract more specific error message if available
      if (err.message) {
        if (err.message.includes("user rejected transaction")) {
          errorMessage = "Transaction rejected by user";
        } else if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas";
        } else if (err.message.includes("Invalid NFT Contract")) {
          errorMessage = "Invalid NFT Contract. Please check approvals.";
        } else if (err.message.includes("execution reverted")) {
          errorMessage = "Transaction reverted. The NFT may already be listed or there could be contract permission issues.";
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

  // Handle UI interactions
  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    toast.success(liked ? "Removed from favorites" : "Added to favorites");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  // Marketplace functions
  const handleBuyNFT = async () => {
    if (!currentNFT) {
      toast.error("NFT data not available");
      return;
    }
    
    // Either use currentOrder or create one from currentNFT if available
    if (!currentOrder && !(currentNFT.isListed && currentNFT.orderId)) {
      toast.error("No active listing found for this NFT");
      return;
    }

    // Get the orderId to use
    const orderId = currentOrder?.orderId || currentNFT.orderId;
    // Get the price to use
    const priceWei = currentOrder?.pricePerNFT || 
      (currentNFT.price ? ethers.parseEther(currentNFT.price.replace(" CORE", "")) : "0");

    if (!orderId || priceWei === "0") {
      toast.error("Invalid listing information");
      return;
    }

    setIsBuying(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const marketplaceContract = new ethers.Contract(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!, ["function buyNow(uint256 orderId, uint16 copies)"], signer);
    
      const formattedPrice = ethers.parseEther(priceWei.toString());
      console.log("Formatted price:", formattedPrice);
      const tx = await marketplaceContract.buyNow(
        orderId,
        0, // ERC721 (copies = 0)
        { value: formattedPrice }
      );
      
      toast.info("Purchase transaction submitted. Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("Purchase transaction confirmed:", receipt);
      toast.success("NFT purchased successfully!");

      router.push("/portfolio");
    } catch (err: any) {
      console.error("Error buying NFT:", err);
      
      // Extract more specific error message if available
      let errorMessage = "Transaction failed";
      if (err.message) {
        if (err.message.includes("user rejected transaction")) {
          errorMessage = "Transaction rejected by user";
        } else if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas";
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsBuying(false);
    }
  };

  // Handle accepting a bid
  const handleAcceptBid = async (orderId: string, bidId: string | number) => {
    console.log("Debug: Starting handleAcceptBid function");
    if (!orderId || bidId === undefined) {
      toast.error("Invalid bid information");
      return;
    }

    // Convert bidId to number if it's a string
    const bidIdNumber = typeof bidId === "string" ? Number(bidId) : bidId;
    
    // Set loading state for this specific bid
    setIsAcceptingBid(true);
    setAcceptingBidId(`${orderId}-${bidIdNumber}`);
    
    try {
      console.log(`Accepting bid ${bidIdNumber} for order ${orderId}`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!, ["function acceptBid(uint256 orderId, uint256 bidId)"], signer);
      
      // Convert orderId to number as well for consistency
      const orderIdNumber = Number(orderId);
      
      // Accept the bid
      const tx = await marketplaceContract.acceptBid(orderIdNumber, bidIdNumber);
      
      toast.info("Accept bid transaction submitted. Waiting for confirmation...");
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log("Accept bid transaction confirmed:", receipt);
      
      // Set the NFT as sold immediately on the UI side to prevent further interaction
      setCurrentOrder(null);
      
      toast.success("NFT has been transferred to the buyer. Transaction complete!");
      
      // After accepting a bid, the NFT is transferred and the listing should be removed
      // Refresh NFTs data first to ensure wallet state is updated
      await refreshNFTs();
      
      // For the seller: redirect to portfolio
      setTimeout(() => {
        // If this NFT was in the user's wallet and is now sold, redirect to portfolio
        if (isOwner) {
          toast.info("Redirecting to your portfolio...");
          router.push("/portfolio");
        } else {
          // If viewing someone else's NFT that was sold, just reload the page
          // to show the updated ownership information
          window.location.reload();
        }
      }, 1500);
    } catch (err: any) {
      console.error("Error accepting bid:", err);
      toast.error(err.message || "Failed to accept bid");
    } finally {
      setIsAcceptingBid(false);
      setAcceptingBidId(null);
    }
  };

  // Handle withdrawing a bid (cancel offer)
  const handleWithdrawBid = async (orderId: string, bidId: string | number) => {
    console.log("Debug: Starting handleWithdrawBid function");
    if (!orderId || bidId === undefined) {
      toast.error("Invalid bid information");
      return;
    }

    // Convert bidId to number if it's a string
    const bidIdNumber = typeof bidId === "string" ? Number(bidId) : bidId;
    
    // Set loading state for this specific bid
    setIsWithdrawingBid(true);
    setWithdrawingBidId(`${orderId}-${bidIdNumber}`);
    
    try {
      console.log(`Withdrawing bid ${bidIdNumber} for order ${orderId}`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!, ["function withdrawRejectBid(uint256 orderId, uint256 bidId, bool isReject)"], signer);
      
      // Convert orderId to number as well for consistency
      const orderIdNumber = Number(orderId);
      
      // Withdraw bid (false means it's not a rejection by seller, but a withdrawal by bidder)
      const tx = await marketplaceContract.withdrawRejectBid(
        orderIdNumber,
        bidIdNumber,
        false // isReject = false for withdraw by bidder
      );
      
      toast.info("Withdraw bid transaction submitted. Waiting for confirmation...");
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log("Withdraw bid transaction confirmed:", receipt);
      
      toast.success("Bid withdrawn successfully!");
      
      // Immediately filter out the withdrawn bid from the UI
      const updatedBids = bids.filter((bid) => !(bid.orderId === orderId && Number(bid.bidId) === bidIdNumber));
      setBids(updatedBids);
      
      // Then refresh from server after a delay to ensure indexer has updated
      setTimeout(() => {
        fetchBids(orderId);
      }, 3000);
    } catch (err: any) {
      console.error("Error withdrawing bid:", err);
      toast.error(err.message || "Failed to withdraw bid");
    } finally {
      setIsWithdrawingBid(false);
      setWithdrawingBidId(null);
    }
  };

  // Handle rejecting a bid (seller rejects an offer)
  const handleRejectBid = async (orderId: string, bidId: string | number) => {
    console.log("Debug: Starting handleRejectBid function");
    if (!orderId || bidId === undefined) {
      toast.error("Invalid bid information");
      return;
    }

    // Convert bidId to number if it's a string
    const bidIdNumber = typeof bidId === "string" ? Number(bidId) : bidId;
    
    // Set loading state for this specific bid
    setIsRejectingBid(true);
    setRejectingBidId(`${orderId}-${bidIdNumber}`);
    
    try {
      console.log(`Rejecting bid ${bidIdNumber} for order ${orderId}`);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!, ["function withdrawRejectBid(uint256 orderId, uint256 bidId, bool isReject)"], signer);
      
      // Convert orderId to number as well for consistency
      const orderIdNumber = Number(orderId);
      
      // Reject bid (true means it's a rejection by seller)
      const tx = await marketplaceContract.withdrawRejectBid(
        orderIdNumber,
        bidIdNumber,
        true // isReject = true for rejection by seller
      );
      
      toast.info("Reject bid transaction submitted. Waiting for confirmation...");
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log("Reject bid transaction confirmed:", receipt);
      
      toast.success("Bid rejected successfully!");
      
      // Update the bid in the UI to mark it as rejected
      const updatedBids = bids.map((bid) => {
        if (bid.orderId === orderId && Number(bid.bidId) === bidIdNumber) {
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
      console.error("Error rejecting bid:", err);
      toast.error(err.message || "Failed to reject bid");
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
        pricePerNFT: bids[0]?.pricePerNFT,
        endTime: bids[0]?.endTime,
        orderId: bids[0]?.orderId
      });
    }
  }, [bids, isOwner]);

  const handleMakeOffer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!currentNFT) {
      toast.error("NFT data not available");
      return;
    }
    
    // Either use currentOrder or create one from currentNFT if available
    if (!currentOrder && !(currentNFT.isListed && currentNFT.orderId)) {
      toast.error("No active listing found for this NFT");
      return;
    }

    // Get the orderId to use
    const orderId = currentOrder?.orderId || currentNFT.orderId;

    if (!orderId) {
      toast.error("Invalid listing information");
      return;
    }

    if (!offerPrice || parseFloat(offerPrice) <= 0) {
      toast.error("Please enter a valid offer price");
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
        ["function placeOfferForOrder(uint256 orderId, uint16 copies, uint256 pricePerNFT, uint256 endTime)"],
        signer
      );
      
      // Convert price to wei
      const priceInWei = ethers.parseEther(offerPrice);
      
      // Calculate end time (current time + X days in seconds)
      const endTime = Math.floor(Date.now() / 1000) + Number(offerDuration) * 24 * 60 * 60;
      
      // Submit offer transaction
      const tx = await marketplaceContract.placeOfferForOrder(
        orderId,
        0, // ERC721 (copies = 0)
        priceInWei,
        endTime,
        { value: priceInWei }
      );
      
      toast.info("Offer transaction submitted. Waiting for confirmation...");
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log("Offer transaction confirmed:", receipt);
      
      toast.success("Offer placed successfully!");
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
      console.error("Error making offer:", err);
      let errorMessage = "Transaction failed";
      
      // Extract more specific error message if available
      if (err.message) {
        if (err.message.includes("user rejected transaction")) {
          errorMessage = "Transaction rejected by user";
        } else if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas";
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

  useEffect(() => {
    // Handle the router query `action` parameter
    setLoading(true);
    
    // Check if we have a query param for action
    const { action } = router.query;
    if (action) {
      console.log("Action from query:", action);
      
      if (action === "manage") {
        setManagingMode(true);
      } else if (action === "list") {
        setListingMode(true);
      } else if (action === "buy") {
        setBuyingMode(true);
      }
    }
    
    setLoading(false);
  }, [router.query]);
  
  // Fix the handleCancelListing function to correctly handle contract interaction
  const handleCancelListing = async () => {
    // Check either for currentOrder or use the NFT's orderId if available
    const orderId = currentOrder?.orderId || (currentNFT ? currentNFT.orderId : undefined);
    const tokenId = currentNFT?.tokenId || "unknown";

    if (!orderId) {
      toast.error("No active listing found for this NFT");
      return;
    }

    setIsCancelling(true);
    try {
      console.log(`Cancelling listing for NFT ${tokenId} with orderId ${orderId}`);

      // Get provider and signer
            const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Log connected wallet address for debugging
      const connectedAddress = await signer.getAddress();
      console.log(`Connected wallet address: ${connectedAddress}`);

      // Create marketplace contract instance
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        [
          "function cancelOrder(uint256 orderId)",
          "function order(uint256 orderId) view returns (uint256 tokenId, uint256 pricePerNFT, uint16 copies, address seller, uint256 startTime, uint256 endTime, address paymentToken, address nftContract)"
        ],
        signer
      );
      
      // Parse orderId to a number if it's in hex format
      let orderIdToCancel: number;
      if (typeof orderId === 'string' && orderId.startsWith('0x')) {
        // Convert from hex to decimal
        orderIdToCancel = parseInt(orderId, 16);
        console.log(`Converting hex orderId ${orderId} to decimal: ${orderIdToCancel}`);
      } else {
        // Convert from string/other format to number
        orderIdToCancel = Number(orderId);
      }
      
      // First verify if the order exists and if we're the seller
      try {
        const orderDetails = await marketplaceContract.order(orderIdToCancel);
        console.log("Order details from contract:", orderDetails);
        
        // Check if the order exists (has a non-zero seller)
        if (orderDetails.seller === ethers.ZeroAddress) {
          console.log("Order not found in contract, might be already cancelled");
          toast.info("This NFT is not currently listed. Refreshing state...");
          
          // Update UI state and redirect to portfolio
          setCurrentOrder(null);
                  refreshNFTs();
          router.push("/portfolio");
          return;
        }
        
        // Check if connected wallet is the seller
        if (connectedAddress.toLowerCase() !== orderDetails.seller.toLowerCase()) {
          toast.error("Only the seller can cancel this listing");
          return;
        }
      } catch (err) {
        console.log("Error fetching order details, will try cancelling anyway:", err);
      }
      
      console.log(`Sending cancelOrder with orderId: ${orderIdToCancel}`);

      // Cancel the order
      const tx = await marketplaceContract.cancelOrder(orderIdToCancel);

      // Show pending message
      toast.info("Cancellation transaction submitted. Waiting for confirmation...");

      // Wait for transaction to be confirmed
      const receipt = await tx.wait();

      console.log("Cancellation transaction confirmed:", receipt);
      toast.success("Listing cancelled successfully!");
      
      // Update local state before redirecting
      setCurrentOrder(null);
      await refreshNFTs();

      // Only redirect to portfolio after transaction is confirmed
      router.push("/portfolio");
    } catch (err: any) {
      console.error("Error cancelling listing:", err);

      // Extract more specific error message if available
      let errorMessage = "Transaction failed";
      if (err.message) {
        if (err.message.includes("user rejected transaction")) {
          errorMessage = "Transaction rejected by user";
        } else if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas";
        } else if (err.message.includes("Invalid request")) {
          errorMessage = "Only the seller can cancel this listing, or the listing may no longer exist";
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
          <p className="mt-2 text-gray-400">Connecting your wallet allows us to verify ownership and display the correct information for this NFT.</p>
          <button className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700" onClick={() => router.push("/")}>
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
          <p className="text-gray-300">{error || "NFT not found"}</p>
          {error && error.includes("connect your wallet") ? (
            <p className="mt-2 text-gray-400">You need to connect your wallet to view NFT details. This allows us to verify ownership and display the correct information.</p>
          ) : null}
          <button 
            className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            onClick={() => (error && error.includes("connect your wallet") ? router.push("/") : router.push("/portfolio"))}>
            {error && error.includes("connect your wallet") ? "Return to Home" : "Return to Portfolio"}
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
                src={currentNFT.image || "/placeholder-nft.jpg"}
                alt={currentNFT.name || "NFT Image"}
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder-nft.jpg";
                }}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
              
              {/* Show SOLD badge if NFT is sold */}
              {isSold && <div className="absolute top-3 right-3 bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg transform rotate-12 z-30">SOLD</div>}
              
              {/* Display action badge based on query parameter */}
              {router.query.action && (
                <div
                  className={`absolute top-3 left-3 
                  ${router.query.action === "manage" ? "bg-blue-500/90" : router.query.action === "buy" ? "bg-green-500/90" : router.query.action === "list" ? "bg-purple-500/90" : "bg-gray-500/90"} 
                  backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-semibold`}>
                  {router.query.action === "manage" ? "Manage Listing" : router.query.action === "buy" ? "Purchase NFT" : router.query.action === "list" ? "List NFT" : "View NFT"}
                </div>
              )}
            </div>
              </div>
              
          {/* NFT Details */}
          <div className="bg-gray-800/70 rounded-xl shadow-2xl p-6 border border-gray-700/50 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-purple-400 to-purple-200 text-transparent bg-clip-text">{currentNFT.name || `Ordinal #${currentNFT.tokenId}`}</h1>
              <div className="flex space-x-3">
                <button onClick={handleLike} className={`p-2 rounded-full ${liked ? "bg-red-500" : "bg-gray-700"} hover:bg-red-600 transition-colors shadow-md`} aria-label="Like NFT">
                  <FaHeart className="text-white" />
                </button>
                <button onClick={handleShare} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors shadow-md" aria-label="Share NFT">
                  <FaShareAlt className="text-white" />
                </button>
              </div>
            </div>

            {/* Owner and Creator */}
            <div className="mb-6">
              <p className="text-gray-400">Owned by</p>
              <p className="text-white font-medium">{isOwner ? "You" : currentNFT.seller || currentOrder?.seller || "Unknown"}</p>
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
                        ? safeFormatEther(currentOrder.pricePerNFT)
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
              {isSold && <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg transform rotate-12 animate-pulse">SOLD</div>}

              {/* Action buttons */}
              <div className="mt-6 flex flex-col space-y-3">
                {isOwner
                  ? // Owner actions
                    currentOrder || currentNFT.isListed
                    ? !isSold && (
                      <button
                        onClick={handleCancelListing}
                        disabled={isCancelling}
                          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-md disabled:opacity-50">
                        {isCancelling ? (
                          <span className="flex items-center justify-center">
                            <FaSpinner className="animate-spin mr-2" /> Cancelling...
                          </span>
                          ) : (
                            "Cancel Listing"
                          )}
                </button>
                    )
                    : !isSold && (
                      <>
                        <button
                          onClick={() => setShowListingForm(!showListingForm)}
                            className={`w-full py-3 ${showListingForm ? "bg-gray-700" : "bg-purple-500 hover:bg-purple-600"} text-white font-bold rounded-lg transition-all duration-300`}>
                            {showListingForm ? "Cancel" : "List for sale"}
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
                                      WebkitAppearance: "none",
                                      MozAppearance: "textfield",
                                      appearance: "textfield",
                                      margin: 0,
                                  }}
                                />
                                <button
                                  onClick={handleListNFT}
                                  disabled={isListing || !listingPrice}
                                    className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors">
                                    {isListing ? <FaSpinner className="animate-spin" /> : "List"}
                </button>
              </div>
                            </div>
                              <p className="text-xs text-gray-400">Setting a price will list your NFT for sale on the marketplace.</p>
                          </div>
                        )}
                      </>
                    )
                  : // Non-owner actions
                    !isSold &&
                    (currentOrder || (currentNFT.isListed && currentNFT.price)) && (
                    <>
                      <button
                        onClick={handleBuyNFT}
                        disabled={isBuying}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isBuying ? (
                          <span className="flex items-center justify-center">
                            <FaSpinner className="animate-spin mr-2" /> Buying...
                          </span>
                          ) : (
                            "Buy Now"
                          )}
                      </button>
                      
                      <button
                        onClick={() => setShowOfferForm(!showOfferForm)}
                          className={`w-full py-3 ${showOfferForm ? "bg-gray-700" : "bg-gray-700 hover:bg-gray-600"} text-white font-bold rounded-lg transition-colors`}>
                          {showOfferForm ? "Cancel" : "Make Offer"}
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
                                    WebkitAppearance: "none",
                                    MozAppearance: "textfield",
                                    appearance: "textfield",
                                    margin: 0,
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="mb-2">
                            <p className="text-white font-medium mb-1">Offer Duration (Days)</p>
                            <select
                              value={offerDuration}
                              onChange={(e) => setOfferDuration(e.target.value)}
                                className="w-full py-2 px-3 bg-gray-800 text-white rounded-lg outline-none border border-gray-700 focus:border-purple-500 transition-colors">
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
                              className="w-full mt-3 px-5 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors">
                              {isMakingOffer ? <FaSpinner className="animate-spin mx-auto" /> : "Confirm Offer"}
                          </button>
                          
                            <p className="text-xs text-gray-400 mt-2">Your offer will be sent to the NFT owner for consideration.</p>
                        </div>
                      )}
                    </>
                )}
                
                {/* Show a sold message when NFT is sold */}
                {isSold && (
                  <div className="mt-4 p-4 bg-gray-800/80 rounded-lg border border-red-500/30">
                    <p className="text-center text-white">This NFT has been sold and is no longer available for purchase.</p>
                    <p className="text-center text-gray-400 text-sm mt-2">The NFT has been transferred to the buyer&apos;s wallet.</p>
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
                        <p className="text-white font-medium">{new Date(currentNFT.metadata.genesisTimestamp * 1000).toLocaleDateString()}</p>
                      </div>
                    )}
                    {currentNFT.metadata.bridgeTimestamp && (
                      <div>
                        <p className="text-gray-400 text-sm">Bridge Date</p>
                        <p className="text-white font-medium">{new Date(currentNFT.metadata.bridgeTimestamp * 1000).toLocaleDateString()}</p>
                      </div>
                    )}
              </div>

                  {currentNFT.metadata.inscriptionId && currentNFT.metadata.inscriptionId !== "Unknown" && (
                <a 
                      href={`https://ordinals.com/inscription/${currentNFT.metadata.inscriptionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                      className="inline-block mt-4 text-purple-400 hover:text-purple-300 font-medium">
                      View on Ordinals Explorer →
                </a>
                  )}
              </div>
              ) : (
                <p className="text-gray-300">No metadata available for this NFT.</p>
              )}
            </div>

            {/* Bids/Offers Section */}
            {(bids.length > 0 || loadingBids) && (
              <div className="border-t border-gray-700/50 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-core-primary to-core-secondary">
                    Offers
                    {bids.length > 0 && <span className="ml-2 text-sm px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded-full">{bids.length}</span>}
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
                      let timeDisplay = "";
                      if (timeLeft <= 0) {
                        timeDisplay = "Expired";
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
                        <div
                          key={`${bid.orderId}-${bid.bidId}`}
                          className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-600/50 transition-all hover:shadow-md shadow-purple-600/10">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <FaUserCircle className="text-gray-400 mr-2" />
                              <span className="text-gray-300">{shortenAddress(bid.bidder)}</span>
                              {isUserBidder && <span className="ml-2 px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded-full">You</span>}
                              {bid.isRejected && <span className="ml-2 px-2 py-0.5 bg-red-900/50 text-red-300 text-xs rounded-full">Rejected</span>}
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
                              <span className="text-white font-medium">{safeFormatEther(bid.pricePerNFT)} CORE</span>
                            </div>
                            
                            {/* Show Accept/Reject buttons to owner if not rejected */}
                            {isOwner && !bid.isRejected ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleAcceptBid(bid.orderId, bid.bidId)}
                                  disabled={isAcceptingBid && acceptingBidId === `${bid.orderId}-${bid.bidId}`}
                                  className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-green-500/20 transition-all duration-200 disabled:opacity-50 flex items-center">
                                  {isAcceptingBid && acceptingBidId === `${bid.orderId}-${bid.bidId}` ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
                                    <>
                                      <FaCheck className="mr-1.5" />
                                      <span className="whitespace-nowrap">Accept</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectBid(bid.orderId, bid.bidId)}
                                  disabled={isRejectingBid && rejectingBidId === `${bid.orderId}-${bid.bidId}`}
                                  className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow-red-500/20 transition-all duration-200 disabled:opacity-50 flex items-center">
                                  {isRejectingBid && rejectingBidId === `${bid.orderId}-${bid.bidId}` ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
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
                                onClick={() => handleWithdrawBid(bid.orderId, bid.bidId)}
                                disabled={isWithdrawingBid && withdrawingBidId === `${bid.orderId}-${bid.bidId}`}
                                className="px-4 py-1.5 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:shadow-red-500/30 transform hover:translate-y-[-1px] transition-all duration-200 disabled:opacity-50 flex items-center justify-center">
                                {isWithdrawingBid && withdrawingBidId === `${bid.orderId}-${bid.bidId}` ? (
                                  <FaSpinner className="animate-spin" />
                                ) : (
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
                          : "This NFT is not currently listed for sale."}
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
                  <p className="text-white font-medium truncate w-48 text-right">{process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS || "Unknown"}</p>
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
