import NFTCard, { NFT } from '../shared/NFTCard';
import { FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/router';

const FeaturedNFTs = () => {
  const router = useRouter();

  const featuredNFTs: NFT[] = [
    {
      id: 1,
      name: 'Ordinal #1234',
      image: 'https://i0.wp.com/techtunestales.com/wp-content/uploads/2023/08/gojo-six-eyes.png?fit=1730%2C966&ssl=1',
      price: '0.5 CORE',
      creator: '0x1234...5678',
      likes: 23,
    },
    {
      id: 2,
      name: 'Ordinal #2345',
      image: 'https://i0.wp.com/techtunestales.com/wp-content/uploads/2023/08/gojo-six-eyes.png?fit=1730%2C966&ssl=1',
      price: '0.8 CORE',
      creator: '0x2345...6789',
      likes: 45,
    },
    {
      id: 3,
      name: 'Ordinal #3456',
      image: 'https://i0.wp.com/techtunestales.com/wp-content/uploads/2023/08/gojo-six-eyes.png?fit=1730%2C966&ssl=1',
      price: '1.2 CORE',
      creator: '0x3456...7890',
      likes: 67,
    },
  ];

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredNFTs.map((nft, index) => (
            <div key={nft.id} 
                 className="animate-fade-in glass-card rounded-xl overflow-hidden"
                 style={{ animationDelay: `${index * 150}ms` }}>
              <NFTCard nft={nft} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedNFTs; 