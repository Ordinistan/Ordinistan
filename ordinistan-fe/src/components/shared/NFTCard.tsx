import { FC } from 'react';
import Image from 'next/image';
import { FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { NFT } from '../../hooks/useWalletNFTs';
import { useAccount } from 'wagmi';

interface NFTCardProps {
  nft: NFT;
  showAll?: boolean; // Added to control visibility of all NFTs on explore page
}

const truncateAddress = (address: string) => {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const NFTCard: FC<NFTCardProps> = ({ nft, showAll = false }) => {
  const router = useRouter();
  const { address } = useAccount();

  // Calculate if the NFT is listed by me or by someone else
  const isListedByMe = nft.isListed && nft.seller && address && nft.seller.toLowerCase() === address.toLowerCase();
  
  // Determine if this card should be shown in the current view
  // On portfolio page (showAll=false), only show user's unlisted NFTs and their own listings
  // On explore page (showAll=true), show all NFTs including those listed by others
  const shouldShow = showAll || !nft.isListed || isListedByMe;
  
  if (!shouldShow) return null;

  // Handle the navigation to the correct page based on the NFT state
  const handleCardClick = () => {
    router.push(`/nft/${nft.tokenId}`);
  };

  // Handle button click to prevent it from triggering the card click
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Navigate based on NFT state and ownership
    if (nft.isListed && isListedByMe) {
      // For user's own listings, go to manage page
      router.push(`/nft/${nft.tokenId}?action=manage`);
    } else if (nft.isListed) {
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
            src={nft.image || '/placeholder-nft.png'} 
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
          {nft.price && nft.price !== 'Not Listed' && (
            <div className="absolute top-3 right-3 bg-purple-500/90 backdrop-blur-sm text-white 
                           px-3 py-1 rounded-full text-xs font-semibold">
              {nft.price}
            </div>
          )}
          
          {/* Listed Badge */}
          {nft.isListed && (
            <div className={`absolute top-3 left-3 ${isListedByMe ? 'bg-blue-500/90' : 'bg-green-500/90'} backdrop-blur-sm text-white 
                           px-3 py-1 rounded-full text-xs font-semibold`}>
              {isListedByMe ? 'Your Listing' : 'Listed'}
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
              {nft.isListed ? (
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
              {nft?.isListed && isListedByMe ? 'Manage' : nft?.isListed ? 'Buy' : 'List for Sale'}
              <FiArrowRight className="ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTCard; 