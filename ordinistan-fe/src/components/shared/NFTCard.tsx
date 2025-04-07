import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import { FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { NFT } from '../../hooks/useWalletNFTs';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';

// Helper function to truncate address
const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

interface NFTCardProps {
  nft: NFT;
  showAll?: boolean; // Added to control visibility of all NFTs on explore page
}

const NFTCard: FC<NFTCardProps> = ({ nft, showAll = false }) => {
  const router = useRouter();
  const { address } = useAccount();
  const [isSold, setIsSold] = useState(false);
  const [currentOwner, setCurrentOwner] = useState<string | null>(null);

  // Check if the NFT has been sold through an accepted bid
  useEffect(() => {
    const checkNftStatus = async () => {
      try {
        // If we're dealing with a listed NFT, check if it has any accepted bids
        if (nft.isListed && nft.orderId) {
          const graphEndpoint = process.env.NEXT_PUBLIC_GRAPH_ENDPOINT;
          if (!graphEndpoint) {
            throw new Error('Graph endpoint not configured');
          }

          const bidAcceptedQuery = `
            {
              bidAccepteds(where: {orderId: "${nft.orderId}"}) {
                orderId
                bidId
                buyer
              }
            }
          `;

          const response = await fetch(graphEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: bidAcceptedQuery
            })
          });

          if (response.ok) {
            const result = await response.json();
            const acceptedBids = result.data?.marketplaceEventBidAccepteds || [];
            
            if (acceptedBids.length > 0) {
              setIsSold(true);
              setCurrentOwner(acceptedBids[0].buyer);
            }
          }
        }
      } catch (error) {
        console.error("Error checking NFT status:", error);
      }
    };
    
    checkNftStatus();
  }, [nft.isListed, nft.orderId, nft.tokenId]);

  // Calculate if the NFT is listed by me or by someone else
  const isListedByMe = nft.isListed && nft.seller && address && nft.seller.toLowerCase() === address.toLowerCase();
  
  // If the NFT was sold and the current user is the new owner, consider it an unlisted NFT
  const isNewOwner = currentOwner && address && currentOwner.toLowerCase() === address.toLowerCase();
  
  // Determine if this card should be shown in the current view
  // On portfolio page (showAll=false), show:
  // - User's unlisted NFTs
  // - User's own listings that haven't been sold
  // - NFTs the user has purchased (new owner)
  // On explore page (showAll=true), show all NFTs except those sold via accepted bids
  const shouldShow = (showAll && !isSold) || 
                    (!showAll && (
                      (!nft.isListed || isNewOwner) || 
                      (isListedByMe && !isSold)
                    ));
  
  if (!shouldShow) return null;

  // Handle the navigation to the correct page based on the NFT state
  const handleCardClick = () => {
    router.push(`/nft/${nft.tokenId}`);
  };

  // Handle button click to prevent it from triggering the card click
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Navigate based on NFT state and ownership
    if (nft.isListed && isListedByMe && !isSold) {
      // For user's own listings, go to manage page
      router.push(`/nft/${nft.tokenId}?action=manage`);
    } else if (nft.isListed && !isSold) {
      // For other's listings, go to buy page
      router.push(`/nft/${nft.tokenId}?action=buy`);
    } else {
      // For unlisted NFTs, go to list page
      router.push(`/nft/${nft.tokenId}?action=list`);
    }
  };

  return (
    <div 
      className="w-full bg-gray-800/80 rounded-xl overflow-hidden shadow-lg hover:shadow-purple-600/30 
                 transition-all duration-300 cursor-pointer border border-gray-700/50"
      onClick={handleCardClick}
    >
      <div className="relative">
        {/* NFT Image */}
        <div className="relative w-full aspect-square overflow-hidden group">
          <Image 
            src={
              nft.image && nft.image.includes('https://api.hiro.so/ordinals/v1/inscriptions/e361e0aa7cb0ci0/content')
                ? "https://photosbook.in/wp-content/uploads/free-fire-photo-dp1.jpg"
                : nft.image || '/placeholder-nft.png'
            } 
            alt={nft.name} 
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-nft.png';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />
          
          {/* Price Tag */}
          {nft.price && nft.price !== 'Not Listed' && !isSold && (
            <div className="absolute top-3 right-3 bg-purple-500/90 backdrop-blur-sm text-white 
                           px-3 py-1 rounded-full text-xs font-semibold">
              {nft.price}
            </div>
          )}
          
          {/* Listed Badge */}
          {nft.isListed && !isSold && (
            <div className={`absolute top-3 left-3 ${isListedByMe ? 'bg-blue-500/90' : 'bg-green-500/90'} backdrop-blur-sm text-white 
                           px-3 py-1 rounded-full text-xs font-semibold`}>
              {isListedByMe ? 'Your Listing' : 'Listed'}
            </div>
          )}
          
          {/* Sold Badge */}
          {isSold && (
            <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-sm text-white 
                           px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
              SOLD
            </div>
          )}
        </div>
        
        {/* NFT Details */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-white truncate">{nft.name}</h3>
          </div>
          
          {/* Token ID/Inscription ID */}
          <p className="text-sm text-gray-400 mb-3 truncate">
            {nft?.metadata?.inscriptionId ? 
              `Inscription: ${nft.metadata.inscriptionId.substring(0, 8)}...` : 
              `Token ID: ${nft.tokenId.substring(0, 8)}...`
            }
          </p>
          
          {/* Bottom section with price and view button */}
          <div className="flex justify-between items-center mt-2">
            <div>
              {isSold ? (
                <p className="text-gray-400 text-xs">
                  Sold
                </p>
              ) : nft.isListed ? (
                <p className="text-gray-400 text-xs">
                  Seller: {nft.seller ? (isListedByMe ? 'You' : truncateAddress(nft.seller)) : 'Unknown'}
                </p>
              ) : (
                <p className="text-gray-400 text-xs">Not Listed</p>
              )}
            </div>
            
            <button 
              className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-800 
                        text-white text-sm rounded-md hover:from-purple-700 hover:to-purple-900 transition-colors"
              onClick={handleButtonClick}
            >
              {isSold ? 'View' : 
                (nft?.isListed && isListedByMe) ? 'Manage' : 
                nft?.isListed ? 'Buy' : 'List for Sale'}
              <FiArrowRight className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTCard; 