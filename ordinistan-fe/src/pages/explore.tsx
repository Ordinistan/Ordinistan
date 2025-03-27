import type { NextPage } from 'next';
import Head from 'next/head';
import NFTCard from '../components/shared/NFTCard';
import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiLoader } from 'react-icons/fi';
import { NFT } from '../hooks/useWalletNFTs';
import { useAllNFTs } from '../hooks/useAllNFTs';

const Explore: NextPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { allNFTs, loading, error } = useAllNFTs();
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    const filterSoldNfts = async () => {
      if (loading) {
        setLoadingStatus(true);
        return;
      }

      setLoadingStatus(true);
      
      try {
        const graphEndpoint = process.env.NEXT_PUBLIC_GRAPH_ENDPOINT;
        if (!graphEndpoint) {
          throw new Error('Graph endpoint not configured');
        }
        
        // Get all bidAccepted events for all orders
        const allOrderIds = allNFTs
          .filter(nft => nft.isListed && nft.orderId)
          .map(nft => nft.orderId);
        
        if (allOrderIds.length === 0) {
          // No orders to check, just use all NFTs
          setFilteredNfts(allNFTs);
          setLoadingStatus(false);
          return;
        }
        
        // Query for accepted bids for these orders
        const bidAcceptedQuery = `
          {
            marketplaceEventBidAccepteds {
              orderId
              bidId
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
          const acceptedOrderIds = new Set(
            (result.data?.marketplaceEventBidAccepteds || [])
              .map((bid: any) => bid.orderId)
          );
          
          // Filter out NFTs with accepted bids
          const unsoldNfts = allNFTs.filter(nft => 
            !nft.isListed || !nft.orderId || !acceptedOrderIds.has(nft.orderId)
          );
          
          setFilteredNfts(unsoldNfts);
        } else {
          // If query fails, just use all NFTs
          setFilteredNfts(allNFTs);
        }
      } catch (error) {
        console.error("Error filtering sold NFTs:", error);
        setFilteredNfts(allNFTs);
      } finally {
        setLoadingStatus(false);
      }
    };
    
    filterSoldNfts();
  }, [allNFTs, loading]);

  // Apply search filters
  const searchFilteredNFTs = filteredNfts.filter(nft => 
    nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (nft.seller && nft.seller.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (nft.metadata?.inscriptionId && nft.metadata.inscriptionId.toLowerCase().includes(searchTerm.toLowerCase()))
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
                  placeholder="Search by name, address, or inscription"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 pl-10 rounded-xl border border-gray-700 bg-gray-800 focus:border-core-primary text-white outline-none"
                />
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <button className="px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 hover:border-core-primary 
                              flex items-center gap-2 text-white">
                <FiFilter />
                Filter
              </button>
            </div>
          </div>

          {loading || loadingStatus ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <FiLoader className="animate-spin text-3xl text-core-primary mr-2" />
              <span className="text-white">Loading NFTs...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-red-500">{error}</div>
            </div>
          ) : searchFilteredNFTs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white">No NFTs found matching your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {searchFilteredNFTs.map((nft, index) => (
                <div key={`${nft.tokenId}-${index}`} 
                     className="animate-fade-in"
                     style={{ animationDelay: `${index * 100}ms` }}>
                  <NFTCard nft={nft} showAll={true} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Explore; 