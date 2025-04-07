import { useState } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { FiLoader, FiGrid, FiList } from 'react-icons/fi';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import NFTCard from '../components/shared/NFTCard';
import { NFT, useWalletNFTs } from '../hooks/useWalletNFTs';
import Link from 'next/link';
import Image from 'next/image';

const Portfolio: NextPage = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const { listedNFTs, unlistedNFTs, loading, error, isConnected } = useWalletNFTs();

  // Custom Portfolio Header Component
  const PortfolioHeader = () => (
    <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center">
      <div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-core-primary to-core-secondary">
          My Portfolio
        </h1>
        <p className="text-gray-400 mt-2">Manage your Ordinals collection</p>
      </div>
      <div className="mt-4 md:mt-0 flex items-center space-x-3">
        <button
          onClick={() => setView('grid')}
          className={`p-2.5 rounded-lg transition-all ${
            view === 'grid' 
              ? 'bg-core-primary text-white' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <FiGrid className="w-5 h-5" />
        </button>
        <button
          onClick={() => setView('list')}
          className={`p-2.5 rounded-lg transition-all ${
            view === 'list' 
              ? 'bg-core-primary text-white' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <FiList className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  const renderNFTGrid = (nfts: NFT[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {nfts.map((nft, index) => (
        <div key={nft.tokenId} 
             className="animate-fade-in"
             style={{ animationDelay: `${index * 100}ms` }}>
          <NFTCard nft={nft} showAll={false} />
        </div>
      ))}
    </div>
  );

  const renderNFTList = (nfts: NFT[]) => (
    <div className="space-y-4">
      {nfts.map((nft, index) => (
        <div key={nft.tokenId} 
             className="animate-fade-in bg-gray-900 rounded-xl p-4 
                      border border-gray-800 hover:border-core-primary/30 transition-all
                      shadow-md hover:shadow-lg hover:shadow-core-primary/10
                      flex items-center gap-4"
             style={{ animationDelay: `${index * 100}ms` }}>
          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image 
              src={
                nft.image && nft.image.includes('https://api.hiro.so/ordinals/v1/inscriptions/e361e0aa7cb0ci0/content')
                  ? "https://photosbook.in/wp-content/uploads/free-fire-photo-dp1.jpg"
                  : nft.image || '/placeholder-nft.png'
              } 
              alt={nft.name || 'NFT'} 
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-grow min-w-0">
            <h3 className="font-semibold text-white">
              {nft.name || `NFT #${nft.tokenId || 'Unknown'}`}
              {nft?.metadata?.inscriptionNumber && (
                <span className="text-sm text-gray-400 ml-2">
                  #{nft.metadata.inscriptionNumber}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-400 truncate">
              ID: {nft?.metadata?.inscriptionId 
                ? `${nft.metadata.inscriptionId.substring(0, 8)}...${nft.metadata.inscriptionId.substring(nft.metadata.inscriptionId.length - 8)}` 
                : 'Unknown'}
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-core-primary font-medium mb-2">{nft.price || 'Not Listed'}</div>
            <Link href={`/nft/${nft.tokenId}`}>
              <button className="px-4 py-2 bg-gradient-to-r from-core-primary to-core-secondary 
                              text-white rounded-lg text-sm font-medium">
                {nft?.isListed ? 'Update Listing' : 'List for Sale'}
              </button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state component
  const EmptyState = ({ message, buttonText, buttonLink }: { message: string, buttonText: string, buttonLink: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 mb-6 rounded-full bg-gray-800 flex items-center justify-center">
        <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <p className="text-gray-400 mb-6 max-w-md">{message}</p>
      <Link href={buttonLink}>
        <button className="px-6 py-3 bg-gradient-to-r from-core-primary to-core-secondary 
                         text-white rounded-xl font-medium hover:shadow-lg hover:shadow-core-primary/25
                         transition-all duration-300 transform hover:scale-105">
          {buttonText}
        </button>
      </Link>
    </div>
  );

  // Section header component
  const SectionHeader = ({ title, count }: { title: string, count: number }) => (
    <div className="flex items-center space-x-3 mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {count > 0 && (
        <span className="px-2 py-1 bg-gray-800 rounded-full text-gray-400 text-xs font-medium">
          {count}
        </span>
      )}
    </div>
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 max-w-md">
          <h1 className="text-3xl font-bold mb-4 text-white">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to view your portfolio
          </p>
          <div className="animate-pulse">
            <svg
              className="w-16 h-16 mx-auto text-gray-600"
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

      <section className="py-28 px-4 min-h-screen bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <PortfolioHeader />
          
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center">
                <FiLoader className="w-10 h-10 animate-spin text-core-primary mb-4" />
                <span className="text-gray-400">Loading your NFTs...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-16 px-4">
              <div className="p-6 bg-red-900/20 rounded-xl border border-red-800 inline-block mb-4">
                <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-core-primary to-core-secondary 
                         text-white rounded-xl font-medium hover:shadow-lg hover:shadow-core-primary/25
                         transition-all"
              >
                Retry
              </button>
            </div>
          ) : listedNFTs.length > 0 || unlistedNFTs.length > 0 ? (
            <div className="space-y-14">
              {/* Listed NFTs Section */}
              <div>
                <SectionHeader title="Listed NFTs" count={listedNFTs.length} />
                {listedNFTs.length > 0 ? (
                  view === 'grid' ? renderNFTGrid(listedNFTs) : renderNFTList(listedNFTs)
                ) : (
                  <div className="bg-gray-800/50 rounded-xl p-6 text-center">
                    <p className="text-gray-400">No listed NFTs found</p>
                  </div>
                )}
              </div>

              {/* Unlisted NFTs Section */}
              <div>
                <SectionHeader title="Unlisted NFTs" count={unlistedNFTs.length} />
                {unlistedNFTs.length > 0 ? (
                  view === 'grid' ? renderNFTGrid(unlistedNFTs) : renderNFTList(unlistedNFTs)
                ) : (
                  <div className="bg-gray-800/50 rounded-xl p-6 text-center">
                    <p className="text-gray-400">No unlisted NFTs found</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState 
              message="No Ordinals found in your portfolio. Bridge your first Ordinal to get started." 
              buttonText="Bridge Your First Ordinal"
              buttonLink="/bridge"
            />
          )}
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default Portfolio;