import { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PortfolioHeader from '../components/portfolio/PortfolioHeader';
import NFTCard, { NFT } from '../components/shared/NFTCard';

const Portfolio: NextPage = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const myNFTs: NFT[] = [
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
    <ProtectedRoute>
      <Head>
        <title>My Portfolio - Ordinistan</title>
        <meta name="description" content="Manage your Ordinals collection on Core Chain" />
      </Head>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <PortfolioHeader view={view} setView={setView} />
          
          {myNFTs.length > 0 ? (
            view === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {myNFTs.map((nft, index) => (
                  <div key={nft.id} 
                       className="animate-fade-in"
                       style={{ animationDelay: `${index * 150}ms` }}>
                    <NFTCard nft={nft} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {myNFTs.map((nft) => (
                  <div key={nft.id} className="animate-fade-in bg-white/80 backdrop-blur-sm rounded-xl p-4 
                                             border border-white/50 hover:border-core-primary/30 transition-all
                                             flex items-center gap-6">
                    <div className="relative w-24 h-24">
                      <img src={nft.image} alt={nft.name} className="rounded-lg object-cover w-full h-full" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg text-core-dark">{nft.name}</h3>
                      <p className="text-sm text-core-muted">{nft.creator}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-core-primary font-medium">{nft.price}</div>
                      <button className="mt-2 px-4 py-2 bg-gradient-to-r from-core-primary to-core-secondary 
                                       text-white rounded-lg text-sm font-medium">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-center py-16">
              <p className="text-core-muted">No Ordinals found in your portfolio</p>
              <button className="mt-4 px-6 py-3 bg-gradient-to-r from-core-primary to-core-secondary 
                               text-white rounded-xl font-medium hover:shadow-lg hover:shadow-core-primary/25">
                Bridge Your First Ordinal
              </button>
            </div>
          )}
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default Portfolio; 