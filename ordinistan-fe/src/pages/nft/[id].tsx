import { useRouter } from 'next/router';
import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { FiArrowLeft, FiHeart, FiShare2, FiExternalLink } from 'react-icons/fi';
import type { NFT } from '../../components/shared/NFTCard';

const NFTDetails = () => {
  const router = useRouter();
  const { id } = router.query;
  const [isLiked, setIsLiked] = useState(false);

  // This would come from your API/backend in production
  const nft: NFT = {
    id: Number(id),
    name: `Ordinal #${id}`,
    image: 'https://i0.wp.com/techtunestales.com/wp-content/uploads/2023/08/gojo-six-eyes.png?fit=1730%2C966&ssl=1',
    price: '0.5 CORE',
    creator: '0x1234...5678',
    likes: 23,
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    // You could add a toast notification here
  };

  return (
    <>
      <Head>
        <title>{nft.name} - Ordinistan</title>
        <meta name="description" content={`View details of ${nft.name} on Ordinistan`} />
      </Head>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button 
            onClick={() => router.back()}
            className="mb-8 flex items-center gap-2 text-core-muted hover:text-core-primary transition-colors"
          >
            <FiArrowLeft />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Image */}
            <div className="space-y-4">
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden 
                            border border-white/20 shadow-lg">
                <Image
                  src={nft.image}
                  alt={nft.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              
              {/* Image Actions */}
              <div className="flex justify-end gap-4">
                <button 
                  onClick={handleLike}
                  className={`p-3 rounded-xl border ${
                    isLiked 
                      ? 'border-red-500 text-red-500' 
                      : 'border-gray-200 text-core-muted'
                  } hover:border-red-500 hover:text-red-500 transition-colors`}
                >
                  <FiHeart className={isLiked ? 'fill-current' : ''} />
                </button>
                <button 
                  onClick={handleShare}
                  className="p-3 rounded-xl border border-gray-200 text-core-muted 
                           hover:border-core-primary hover:text-core-primary transition-colors"
                >
                  <FiShare2 />
                </button>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-core-dark mb-2">{nft.name}</h1>
                <p className="text-core-muted">Created by {nft.creator}</p>
              </div>

              {/* Price Section */}
              <div className="p-6 rounded-xl bg-white/80 backdrop-blur-sm border border-white/50">
                <p className="text-sm text-core-muted mb-2">Current Price</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-core-dark">{nft.price}</span>
                  <span className="text-core-muted">($XXX.XX)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button className="w-full py-4 bg-gradient-to-r from-core-primary to-core-secondary 
                                 text-white rounded-xl font-medium hover:shadow-lg 
                                 hover:shadow-core-primary/25 transition-all">
                  Purchase Now
                </button>
                <button className="w-full py-4 border border-core-primary text-core-primary 
                                 rounded-xl font-medium hover:bg-core-primary/5 transition-all">
                  Make Offer
                </button>
              </div>

              {/* Details Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-core-dark">Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-core-muted">Token ID</p>
                    <p className="font-medium text-core-dark">{id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-core-muted">Token Standard</p>
                    <p className="font-medium text-core-dark">Ordinal</p>
                  </div>
                  <div>
                    <p className="text-sm text-core-muted">Blockchain</p>
                    <p className="font-medium text-core-dark">Core Chain</p>
                  </div>
                  <div>
                    <p className="text-sm text-core-muted">Last Updated</p>
                    <p className="font-medium text-core-dark">1 hour ago</p>
                  </div>
                </div>
              </div>

              {/* Links Section */}
              <div className="pt-4 border-t border-gray-200">
                <a 
                  href="#" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-core-primary hover:text-core-secondary transition-colors"
                >
                  View on Explorer
                  <FiExternalLink />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default NFTDetails; 















