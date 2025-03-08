import { FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/router';

const HeroSection = () => {
  const router = useRouter();

  return (
    <section className="relative bg-gradient-to-br from-core-dark via-core-primary to-core-secondary w-screen">
      <div className="absolute inset-0 bg-hero-pattern opacity-10 animate-glow"></div>
      <div className="absolute inset-0 bg-gradient-radial from-transparent to-core-dark/30"></div>
      <div className="relative flex items-center justify-center py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-float">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
              Bridge Bitcoin Ordinals to{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end bg-clip-text text-transparent">
                  Core Chain
                </span>
                <span className="absolute -inset-1 bg-gradient-to-r from-gradient-start/20 to-gradient-end/20 blur-lg -z-10"></span>
              </span>
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-200 max-w-2xl mx-auto mb-8 leading-relaxed">
            Experience seamless trading of Bitcoin Ordinals with lower fees and faster transactions on Core Chain.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <button 
              onClick={() => router.push('/bridge')}
              className="group bg-white text-core-primary px-6 py-3 rounded-xl font-semibold hover:bg-opacity-95 transition-all shadow-lg hover:shadow-xl hover:shadow-white/10 backdrop-blur-sm"
            >
              Start Bridging
              <FiArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => router.push('/explore')}
              className="group px-6 py-3 rounded-xl font-semibold border-2 border-white/30 text-white hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Explore Market
              <FiArrowRight className="inline ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 