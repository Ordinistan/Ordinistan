import NFTCard from '../shared/NFTCard';
import { FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useWalletNFTs } from '../../hooks/useWalletNFTs';

const FeaturedNFTs = () => {
  const router = useRouter();
  const { nfts, loading, error } = useWalletNFTs();

  // Show loading state
  if (loading) {
    return (
      <section className="py-16 px-4 bg-gradient-to-b from-core-dark to-core-darker">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-core-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className="py-16 px-4 bg-gradient-to-b from-core-dark to-core-darker">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-red-500">{error}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-core-dark to-core-darker">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-12">
          <div className="mb-6 sm:mb-0">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Featured <span className="text-core-primary">Ordinals</span>
            </h2>
            <p className="text-core-muted">Discover unique Bitcoin Ordinals on Core Chain</p>
          </div>
          <button 
            onClick={() => router.push('/explore')}
            className="group px-6 py-3 bg-core-primary hover:bg-core-primary/90
                     text-white rounded-xl font-medium transition-all 
                     flex items-center gap-2"
          >
            View All
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {nfts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-core-muted">No NFTs found. Connect your wallet to view your collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {nfts.map((nft, index) => (
              <div key={nft.id} 
                   className="animate-fade-in glass-card rounded-xl overflow-hidden"
                   style={{ animationDelay: `${index * 150}ms` }}>
                <NFTCard nft={nft} showAll={true} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedNFTs; 