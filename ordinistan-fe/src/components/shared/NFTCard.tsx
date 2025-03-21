import Image from 'next/image';
import { FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/router';
import type { NFT } from '../../hooks/useWalletNFTs';

interface NFTCardProps {
  nft: NFT;
}

const NFTCard = ({ nft }: NFTCardProps) => {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/nft/${nft.tokenId}`);
  };

  return (
    <div className="group relative">
      <div className="relative bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-2xl 
                    overflow-hidden transition-all duration-500 hover:transform hover:-translate-y-2
                    border border-white/20 hover:border-core-primary/30 
                    shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_40px_rgba(30,64,175,0.12)]">
        <div className="relative aspect-[16/9] w-full">
          <div className="absolute inset-0 bg-gradient-to-br from-core-primary/20 to-core-secondary/20 z-0" />
          <Image
            src={nft.image}
            alt={nft.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="p-5 bg-gradient-to-b from-transparent to-black/5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-lg text-core-dark group-hover:text-core-primary transition-colors">
                {nft.name}
              </h3>
              <p className="text-sm text-core-muted">Token ID: {nft.tokenId}</p>
              <p className="text-sm text-core-muted truncate" title={nft.metadata.inscriptionId}>
                Inscription: {nft.metadata.inscriptionId}
              </p>
            </div>
            <span className="px-3 py-1 bg-core-primary/10 rounded-full text-core-primary text-sm font-medium">
              {nft.price}
            </span>
          </div>

          <button 
            onClick={handleViewDetails}
            className="w-full py-3 px-4 bg-gradient-to-r from-core-primary to-core-secondary 
                     text-white rounded-xl font-medium transform transition-all duration-300
                     hover:shadow-lg hover:shadow-core-primary/25 group-hover:scale-[1.02]
                     flex items-center justify-center gap-2"
          >
            {nft.isListed ? 'Update Listing' : 'List for Sale'}
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NFTCard; 