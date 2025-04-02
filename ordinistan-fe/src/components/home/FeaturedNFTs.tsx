import { useState, useEffect } from 'react';
import NFTCard from '../shared/NFTCard';
import { FiArrowRight } from 'react-icons/fi';
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
        // Make sure we have NFTs to display
        if (!allNFTs || !Array.isArray(allNFTs)) {
          setFilteredNfts([]);
          setLoadingStatus(false);
          return;
        }
        
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
          // Get a random selection of NFTs if we have more than 6
          const nftsToShow = allNFTs.length > 6 
            ? allNFTs.sort(() => 0.5 - Math.random()).slice(0, 6) 
            : allNFTs;
          
          setFilteredNfts(nftsToShow);
          setLoadingStatus(false);
          return;
        }
        
        // Query for accepted bids for these orders
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
          body: JSON.stringify({
            query: bidAcceptedQuery
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("Bid accepted query result:", result);
          
          const acceptedOrderIds = new Set(
            (result.data?.bidAccepteds || [])
              .map((bid: any) => bid.orderId.toString())
          );
          
          console.log("Accepted order IDs:", Array.from(acceptedOrderIds));
          console.log("NFT order IDs to check:", allNFTs
            .filter(nft => nft.isListed && nft.orderId)
            .map(nft => nft.orderId));
          
          // Filter out NFTs with accepted bids
          const unsoldNfts = allNFTs.filter(nft => 
            !nft.isListed || !nft.orderId || !acceptedOrderIds.has(nft.orderId)
          );
          
          // Prioritize listed NFTs but show a mix if possible
          let nftsToShow: NFT[] = [];
          const availableListedNFTs = unsoldNfts.filter(nft => nft.isListed);
          
          if (availableListedNFTs.length >= 6) {
            // If we have enough listed NFTs, show 6 random ones
            nftsToShow = availableListedNFTs.sort(() => 0.5 - Math.random()).slice(0, 6);
          } else {
            // Otherwise, show all available listed NFTs and fill the rest with unlisted
            nftsToShow = [
              ...availableListedNFTs,
              ...unsoldNfts.filter(nft => !nft.isListed)
                .sort(() => 0.5 - Math.random())
                .slice(0, 6 - availableListedNFTs.length)
            ];
          }
          
          setFilteredNfts(nftsToShow);
        } else {
          // If query fails, just use a sampling of all NFTs
          const nftsToShow = allNFTs.length > 6 
            ? allNFTs.sort(() => 0.5 - Math.random()).slice(0, 6) 
            : allNFTs;
          
          setFilteredNfts(nftsToShow);
        }
      } catch (error) {
        console.error("Error filtering sold NFTs:", error);
        // Ensure filteredNfts is an array even if there's an error
        // Just show a random selection of NFTs
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

  // Show loading state
  if (loading || loadingStatus) {
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

        {!filteredNfts || filteredNfts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-core-muted">No NFTs available at the moment.</p>
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
    </section>
  );
};

export default FeaturedNFTs; 