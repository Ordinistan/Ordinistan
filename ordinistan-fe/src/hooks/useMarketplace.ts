import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import marketplaceAbi from './marketPlace.json';

// Marketplace Contract ABI - only include functions we need
const MARKETPLACE_ABI = marketplaceAbi;

// GraphQL query for marketplace orders - fixed to match schema types
const MARKETPLACE_ORDERS_QUERY = `
  query GetMarketplaceOrders($tokenId: String) {
    marketplaceEventOrderCreateds(where: {tokenId_eq: $tokenId}) {
      id
      orderId
      tokenId
      pricePerNft
      seller
      copies
      startTime
      endTime
      paymentToken
      nftContract
      blockTimestamp
      transactionHash
    }
  }
`;

// GraphQL query for marketplace orders by seller - fixed to match schema types
const MARKETPLACE_SELLER_ORDERS_QUERY = `
  query GetSellerOrders($seller: String!) {
    marketplaceEventOrderCreateds(where: {seller_eq: $seller}) {
      id
      orderId
      tokenId
      pricePerNft
      seller
      copies
      startTime
      endTime
      paymentToken
      nftContract
      blockTimestamp
      transactionHash
    }
  }
`;

export interface MarketplaceOrder {
  orderId: string;
  tokenId: string;
  pricePerNft: string;
  seller: string;
  copies: number;
  startTime: string;
  endTime: string;
  paymentToken: string;
  nftContract: string;
  blockTimestamp: string;
  transactionHash: string;
}

export function useMarketplace(tokenId?: string) {
  const { address, isConnected } = useAccount();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch token listings from subsquid
  useEffect(() => {
    const fetchOrders = async () => {
      if (!tokenId) {
        setOrders([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        // Use the subsquid GraphQL endpoint
        const subsquidEndpoint = "http://52.64.159.183:4350/graphql";
        
        console.log("Fetching marketplace orders for tokenId:", tokenId);
        
        const response = await fetch(subsquidEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: MARKETPLACE_ORDERS_QUERY,
            variables: {
              tokenId: tokenId.toString(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Subsquid API error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Marketplace orders response:", result);

        if (result.errors) {
          console.error("GraphQL errors:", result.errors);
          throw new Error(result.errors[0].message);
        }

        // Updated to match the correct field name from the schema
        const ordersData = result.data?.marketplaceEventOrderCreateds || [];
        setOrders(ordersData);
      } catch (err: any) {
        console.error('Error fetching marketplace orders:', err);
        setError('Failed to fetch marketplace listings. Please try again.');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [tokenId]);

  // List NFT for sale
  const listNFT = async (
    tokenId: string, 
    price: string, 
    copies: number = 1, 
    endTimeInDays: number = 30
  ) => {
    if (!address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        MARKETPLACE_ABI,
        signer
      );
      
      // Convert price from ETH to wei
      const priceInWei = ethers.parseEther(price);
      
      // Calculate end time (current time + days in seconds)
      const endTime = Math.floor(Date.now() / 1000) + (endTimeInDays * 24 * 60 * 60);
      
      console.log("Listing NFT with parameters:", {
        tokenId,
        nftContract: process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
        copies,
        priceInWei: priceInWei.toString(),
        paymentToken: ethers.ZeroAddress,
        endTime
      });
      
      // Place order for sell

    //   uint256 tokenId,
    //   address nftContract,
    //   uint16 copies, // = 0 means 721 NFT
    //   uint256 pricePerNFT,
    //   address paymentToken,
    //   uint256 endTime

    console.log("BRIDGE ADDRESS", process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!)
      const tx = await marketplaceContract.placeOrderForSell(
        tokenId,
        process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!, // NFT contract address
        0,
        priceInWei,
        ethers.ZeroAddress, // Use native token (CORE)
        endTime
      );
      
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error listing NFT:', err);
      throw err; // Rethrow to allow proper error handling in UI
    } finally {
      setLoading(false);
    }
  };

  // Buy NFT
  const buyNFT = async (orderId: string, price: string, copies: number = 1) => {
    if (!address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        MARKETPLACE_ABI,
        signer
      );
      
      // Convert price from ETH to wei
      const priceInWei = ethers.parseEther(price);
      
      // Buy NFT
      const tx = await marketplaceContract.buyNow(
        orderId,
        copies,
        { value: priceInWei }
      );
      
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error buying NFT:', err);
      setError(err.message || 'Transaction failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Cancel listing
  const cancelListing = async (orderId: string) => {
    if (!address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        MARKETPLACE_ABI,
        signer
      );
      
      // Cancel order
      const tx = await marketplaceContract.cancelOrder(orderId);
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error cancelling listing:', err);
      setError(err.message || 'Transaction failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Make offer for NFT
  const makeOffer = async (
    orderId: string, 
    offerPrice: string, 
    copies: number = 1, 
    endTimeInDays: number = 7
  ) => {
    if (!address || !isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const marketplaceContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS!,
        MARKETPLACE_ABI,
        signer
      );
      
      // Convert price from ETH to wei
      const priceInWei = ethers.parseEther(offerPrice);
      
      // Calculate end time (current time + days in seconds)
      const endTime = Math.floor(Date.now() / 1000) + (endTimeInDays * 24 * 60 * 60);
      
      // Place offer
      const tx = await marketplaceContract.placeOfferForOrder(
        orderId,
        copies,
        priceInWei,
        endTime,
        { value: priceInWei }
      );
      
      await tx.wait();
      return true;
    } catch (err: any) {
      console.error('Error making offer:', err);
      setError(err.message || 'Transaction failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { 
    orders, 
    loading, 
    error, 
    listNFT, 
    buyNFT, 
    cancelListing, 
    makeOffer 
  };
}

// Hook to get user's own listings
export function useUserListings() {
  const { address, isConnected } = useAccount();
  const [listings, setListings] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserListings = async () => {
      if (!address || !isConnected) {
        setListings([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use the subsquid GraphQL endpoint
        const subsquidEndpoint = "http://52.64.159.183:4350/graphql";
        
        console.log("Fetching user listings for address:", address.toLowerCase());
        
        const response = await fetch(subsquidEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: MARKETPLACE_SELLER_ORDERS_QUERY,
            variables: {
              seller: address.toLowerCase(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Subsquid API error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("User listings response:", result);

        if (result.errors) {
          console.error("GraphQL errors:", result.errors);
          throw new Error(result.errors[0].message);
        }

        // Updated to match the correct field name from the schema
        const listingsData = result.data?.marketplaceEventOrderCreateds || [];
        setListings(listingsData);
      } catch (err: any) {
        console.error('Error fetching user listings:', err);
        setError('Failed to fetch your listings. Please try again.');
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserListings();
  }, [address, isConnected]);

  return { listings, loading, error };
} 