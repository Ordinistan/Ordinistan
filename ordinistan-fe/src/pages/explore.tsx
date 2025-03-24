import type { NextPage } from 'next';
import Head from 'next/head';
import NFTCard from '../components/shared/NFTCard';
import { useState } from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';
import { NFT } from '../hooks/useWalletNFTs';

const Explore: NextPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // This would eventually come from your API/backend
  const allNFTs: NFT[] = Array(12).fill(null).map((_, index) => ({
    id: index + 1,
    tokenId: (index + 1234).toString(),
    name: `Ordinal #${(index + 1234).toString()}`,
    image: 'https://i0.wp.com/techtunestales.com/wp-content/uploads/2023/08/gojo-six-eyes.png?fit=1730%2C966&ssl=1',
    price: `${(0.5 + index * 0.1).toFixed(1)} CORE`,
    creator: "0x" + (index + 1234).toString(16) + "..." + (index + 5678).toString(16),
    isListed: Math.random() > 0.5,
    metadata: {
      inscriptionId: `${(index + 9999).toString(16)}i0`,
      inscriptionNumber: index + 1000,
      contentType: 'image/png',
      contentLength: 10000,
      satOrdinal: '12345',
      satRarity: 'common',
      genesisTimestamp: Date.now() - 1000000,
      bridgeTimestamp: Date.now() - 500000
    }
  }));

  const filteredNFTs = allNFTs.filter(nft => 
    nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nft.creator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Explore Ordinals - Ordinistan</title>
        <meta name="description" content="Explore all Bitcoin Ordinals on Core Chain" />
      </Head>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-core-primary to-core-secondary 
                         bg-clip-text text-transparent mb-4">
              Explore Ordinals
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search by name or creator"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 pl-10 rounded-xl border border-gray-200 focus:border-core-primary outline-none"
                />
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <button className="px-4 py-3 rounded-xl border border-gray-200 hover:border-core-primary 
                               flex items-center gap-2 text-core-dark">
                <FiFilter />
                Filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNFTs.map((nft, index) => (
              <div key={nft.id} 
                   className="animate-fade-in"
                   style={{ animationDelay: `${index * 100}ms` }}>
                <NFTCard nft={nft} showAll={true} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Explore; 