import { useState, useEffect } from 'react';
import NFTCard from '../shared/NFTCard';
import { useRouter } from 'next/router';
import { NFT } from '../../hooks/useWalletNFTs';
import { useAllNFTs } from '../../hooks/useAllNFTs';

const FeaturedNFTs = () => {
  const router = useRouter();
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
        if (!allNFTs || !Array.isArray(allNFTs)) {
          setFilteredNfts([]);
          setLoadingStatus(false);
          return;
        }
        
        const graphEndpoint = process.env.NEXT_PUBLIC_GRAPH_ENDPOINT;
        if (!graphEndpoint) {
          throw new Error('Graph endpoint not configured');
        }
        
        const allOrderIds = allNFTs
          .filter(nft => nft.isListed && nft.orderId)
          .map(nft => nft.orderId);
        
        if (allOrderIds.length === 0) {
          const nftsToShow = allNFTs.length > 6 
            ? allNFTs.sort(() => 0.5 - Math.random()).slice(0, 6) 
            : allNFTs;
          setFilteredNfts(nftsToShow);
          setLoadingStatus(false);
          return;
        }
        
        const bidAcceptedQuery = `
          query {
            bidAccepteds {
              id
              orderId
              bidId
            }
          }
        `;
        
        const response = await fetch(graphEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: bidAcceptedQuery })
        });
        
        if (response.ok) {
          const result = await response.json();
          const acceptedOrderIds = new Set(
            (result.data?.bidAccepteds || []).map((bid: any) => bid.orderId.toString())
          );
          
          const unsoldNfts = allNFTs.filter(nft => 
            !nft.isListed || !nft.orderId || !acceptedOrderIds.has(nft.orderId)
          );
          
          let nftsToShow: NFT[] = [];
          const availableListedNFTs = unsoldNfts.filter(nft => nft.isListed);
          
          if (availableListedNFTs.length >= 6) {
            nftsToShow = availableListedNFTs.sort(() => 0.5 - Math.random()).slice(0, 6);
          } else {
            nftsToShow = [
              ...availableListedNFTs,
              ...unsoldNfts.filter(nft => !nft.isListed)
                .sort(() => 0.5 - Math.random())
                .slice(0, 6 - availableListedNFTs.length)
            ];
          }
          setFilteredNfts(nftsToShow);
        } else {
          const nftsToShow = allNFTs.length > 6 
            ? allNFTs.sort(() => 0.5 - Math.random()).slice(0, 6) 
            : allNFTs;
          setFilteredNfts(nftsToShow);
        }
      } catch (error) {
        console.error("Error filtering sold NFTs:", error);
        const nftsToShow = Array.isArray(allNFTs) && allNFTs.length > 0
          ? allNFTs.sort(() => 0.5 - Math.random()).slice(0, 6)
          : [];
        setFilteredNfts(nftsToShow);
      } finally {
        setLoadingStatus(false);
      }
    };
    
    filterSoldNfts();
  }, [allNFTs, loading]);

  if (loading || loadingStatus) {
    return (
      <div className="bg-black">
        <div className="max-w-[1370px] mx-auto px-8 py-10 md:py-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black">
        <div className="max-w-[1370px] mx-auto px-8 py-10 md:py-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-red-500">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black">
      <div className="max-w-[1370px] mx-auto px-8 py-10 md:py-16">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
          <div className="text-center md:text-left flex flex-col gap-1 md:gap-3">
            <h2 className="text-3xl md:text-5xl font-[450] text-white max-w-[450px]">
              Featured NFTs
            </h2>
            <p className="text-sm md:text-xl text-gray-400">
              Discover unique NFTs on Core Chain
            </p>
          </div>
          <button 
            onClick={() => router.push('/explore')}
            className="rounded-full border-2 border-gray-600/50 px-6 py-2 text-lg text-white font-medium hover:bg-gray-100 hover:text-black transition-all duration-300"
          >
            View All
          </button>
        </div>
        {!filteredNfts || filteredNfts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No NFTs available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNfts.map((nft, index) => (
              <div key={`${nft.tokenId}-${index}`} 
                   className="animate-fade-in glass-card rounded-xl overflow-hidden"
                   style={{ animationDelay: `${index * 150}ms` }}>
                <NFTCard nft={nft} showAll={true} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedNFTs;
