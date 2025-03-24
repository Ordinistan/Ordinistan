import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWalletNFTs } from '../../hooks/useWalletNFTs';
import { useMarketplace, MarketplaceOrder } from '../../hooks/useMarketplace';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { FaEthereum, FaHeart, FaShareAlt, FaSpinner, FaInfoCircle } from 'react-icons/fa';

// Simple Layout component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800/80 border-b border-gray-700 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-purple-300 text-transparent bg-clip-text">Ordinistan</h1>
          <div className="flex space-x-2">
            <a href="/portfolio" className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white">
              My Portfolio
            </a>
            <a href="/explore" className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white">
              Explore
            </a>
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

const NFTDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { address, isConnected } = useAccount();
  const { nfts, loading: nftsLoading } = useWalletNFTs();
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
  
  // Form states
  const [listingPrice, setListingPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  
  // UI states
  const [showListingForm, setShowListingForm] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect to find the NFT based on ID
  useEffect(() => {
    if (!id || nftsLoading) return;
    
    try {
      // Find the NFT by its token ID
      const nft = nfts.find(nft => nft.tokenId === id);
      
      if (nft) {
        setCurrentNFT(nft);
        // Set isOwner only if the wallet address matches the NFT seller or the current address
        const ownershipCheck = address?.toLowerCase() === (nft.seller || address)?.toLowerCase();
        console.log("Ownership check:", { 
          address: address?.toLowerCase(), 
          seller: nft.seller?.toLowerCase(), 
          isOwner: ownershipCheck 
        });
        setIsOwner(ownershipCheck);
        console.log("Found NFT in wallet:", nft);
        
        // Check if NFT is already listed in the marketplace
        if (orders && orders.length > 0) {
          const existingOrder = orders.find(order => 
            order.tokenId === id && 
            order.seller.toLowerCase() === address?.toLowerCase()
          );
          
          if (existingOrder) {
            setCurrentOrder(existingOrder);
            console.log("Found listing for NFT:", existingOrder);
          }
        }
        
        // Important: If the NFT is marked as listed in our wallet data, we should set the currentOrder
        // even if we didn't find it in orders (which might happen due to API issues)
        if (nft.isListed && nft.orderId && !currentOrder) {
          console.log("NFT is listed according to wallet data:", nft);
          // Create a minimal order object from the NFT data
          setCurrentOrder({
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
          });
        }
      } else {
        // If not in user's wallet, try to get info from orders
        if (orders && orders.length > 0) {
          setCurrentOrder(orders[0]);
          console.log("Found NFT in marketplace orders:", orders[0]);
          
          // We need to fetch the metadata for this token from the bridge contract
          // For now, use a placeholder and fallback image
          const fetchMetadata = async () => {
            try {
              // Create a basic NFT object first with fallbacks
              const basicNFT = {
                tokenId: orders[0].tokenId,
                name: `Ordinistan #${orders[0].tokenId}`,
                image: '/placeholder-nft.jpg',
                description: 'Bridged Bitcoin Ordinal',
                inscriptionId: 'Unknown',
                seller: orders[0].seller,
                metadata: {
                  inscriptionId: 'Unknown',
                  contentType: 'Unknown',
                  satOrdinal: 'Unknown',
                  satRarity: 'Unknown'
                }
              };
              
              setCurrentNFT(basicNFT);
              
              // Set isOwner flag properly
              setIsOwner(address?.toLowerCase() === orders[0].seller.toLowerCase());
              
              // Try to fetch real metadata using ethers
              if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const contract = new ethers.Contract(
                  process.env.NEXT_PUBLIC_BRIDGE_CONTRACT_ADDRESS!,
                  ['function ordinalMetadata(uint256 tokenId) view returns (tuple(string, uint256, string, uint256, string, string, uint256, uint256))'],
                  provider
                );
                
                try {
                  const metadata = await contract.ordinalMetadata(orders[0].tokenId);
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
        } else {
          setError('NFT not found in your wallet or marketplace.');
        }
      }
    } catch (err: any) {
      console.error('Error finding NFT:', err);
      setError('Error loading NFT details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id, nfts, nftsLoading, orders, address]);

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
        0, // ERC721 (copies = 0)
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
      console.log(`Making offer on NFT #${currentNFT.tokenId} for ${offerPrice} CORE`);
      
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
      
      // Calculate end time (current time + 7 days in seconds)
      const endTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
      
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
      
      // Redirect to portfolio only after confirmation
      router.push('/portfolio');
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

  if (error || !currentNFT) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-96 text-center p-4">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-300">{error || 'NFT not found'}</p>
          <button 
            className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            onClick={() => router.push('/portfolio')}
          >
            Return to Portfolio
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

              {/* Action buttons */}
              <div className="space-y-4">
                {isOwner ? (
                  // Owner actions
                  currentOrder || currentNFT.isListed ? (
                    <button
                      onClick={handleCancelListing}
                      disabled={isCancelling}
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCancelling ? (
                        <span className="flex items-center justify-center">
                          <FaSpinner className="animate-spin mr-2" /> Cancelling listing...
                        </span>
                      ) : 'Cancel Listing'}
                    </button>
                  ) : (
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
                ) : (
                  // Non-owner actions
                  (currentOrder || (currentNFT.isListed && currentNFT.price)) && (
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
                              <button
                                onClick={handleMakeOffer}
                                disabled={isMakingOffer || !offerPrice}
                                className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                              >
                                {isMakingOffer ? <FaSpinner className="animate-spin" /> : 'Offer'}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400">
                            Your offer will be sent to the NFT owner for consideration.
                          </p>
                        </div>
                      )}
                    </>
                  )
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















