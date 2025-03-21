import { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { FiLoader } from 'react-icons/fi';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PortfolioHeader from '../components/portfolio/PortfolioHeader';
import NFTCard from '../components/shared/NFTCard';
import { useWalletNFTs } from '../hooks/useWalletNFTs';
import Link from 'next/link';

const Portfolio: NextPage = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const { listedNFTs, unlistedNFTs, loading, error, isConnected } = useWalletNFTs();

  const renderNFTGrid = (nfts: ReturnType<typeof useWalletNFTs>['nfts']) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {nfts.map((nft, index) => (
        <div key={nft.tokenId} 
             className="animate-fade-in"
             style={{ animationDelay: `${index * 150}ms` }}>
          <NFTCard nft={nft} />
        </div>
      ))}
    </div>
  );

  const renderNFTList = (nfts: ReturnType<typeof useWalletNFTs>['nfts']) => (
    <div className="space-y-4">
      {nfts.map((nft) => (
        <div key={nft.tokenId} className="animate-fade-in bg-white/80 backdrop-blur-sm rounded-xl p-4 
                                       border border-white/50 hover:border-core-primary/30 transition-all
                                       flex items-center gap-6">
          <div className="relative w-24 h-24">
            <img src={nft.image} alt={nft.name} className="rounded-lg object-cover w-full h-full" />
          </div>
          <div className="flex-grow">
            <h3 className="font-semibold text-lg text-core-dark">{nft.name}</h3>
            <p className="text-sm text-core-muted">Token ID: {nft.tokenId}</p>
            <p className="text-sm text-core-muted">Inscription: {nft.metadata.inscriptionId}</p>
          </div>
          <div className="text-right">
            <div className="text-core-primary font-medium">{nft.price}</div>
            <button className="mt-2 px-4 py-2 bg-gradient-to-r from-core-primary to-core-secondary 
                             text-white rounded-lg text-sm font-medium">
              {nft.isListed ? 'Update Listing' : 'List for Sale'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view your portfolio
          </p>
          <div className="animate-pulse">
            <svg
              className="w-16 h-16 mx-auto text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>My Portfolio - Ordinistan</title>
        <meta name="description" content="Manage your Ordinals collection on Core Chain" />
      </Head>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <PortfolioHeader view={view} setView={setView} />
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <FiLoader className="w-8 h-8 animate-spin text-core-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-core-primary to-core-secondary 
                         text-white rounded-xl font-medium hover:shadow-lg hover:shadow-core-primary/25"
              >
                Retry
              </button>
            </div>
          ) : listedNFTs.length > 0 || unlistedNFTs.length > 0 ? (
            <div className="space-y-12">
              {/* Listed NFTs Section */}
              <div>
                <h2 className="text-2xl font-bold text-core-dark mb-6">Listed NFTs</h2>
                {listedNFTs.length > 0 ? (
                  view === 'grid' ? renderNFTGrid(listedNFTs) : renderNFTList(listedNFTs)
                ) : (
                  <p className="text-core-muted text-center py-8">No listed NFTs found</p>
                )}
              </div>

              {/* Unlisted NFTs Section */}
              <div>
                <h2 className="text-2xl font-bold text-core-dark mb-6">Unlisted NFTs</h2>
                {unlistedNFTs.length > 0 ? (
                  view === 'grid' ? renderNFTGrid(unlistedNFTs) : renderNFTList(unlistedNFTs)
                ) : (
                  <p className="text-core-muted text-center py-8">No unlisted NFTs found</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-core-muted">No Ordinals found in your portfolio</p>
              <Link href="/bridge">
                <button className="mt-4 px-6 py-3 bg-gradient-to-r from-core-primary to-core-secondary 
                                 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-core-primary/25">
                  Bridge Your First Ordinal
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default Portfolio;