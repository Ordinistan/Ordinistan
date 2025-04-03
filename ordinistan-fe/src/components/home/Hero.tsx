import React from "react";
// import HeaderContent from "./HeaderContent";

const backgroundAnimation: string = "/animations/background-animation.gif";
const ringAnimation: string = "/animations/ring-animation.gif";

const Hero: React.FC = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center text-white md:min-h-[600px]">
      {/* Background Animation */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={backgroundAnimation}
          alt="Background Animation"
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Ring Animation */}
      <div className="absolute -right-40 top-2/3 transform -translate-y-1/2">
        <img
          src={ringAnimation}
          alt="Ring Animation"
          className="w-[500px] animate-[spin_10s_linear_infinite]"
        />
      </div>
      
      {/* Header Content
      <header className="absolute top-5 w-full mx-auto px-4">
        <HeaderContent />
      </header> */}
      
      {/* Centered Content */}
      <div className="mt-6 md:mt-12 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full max-w-[800px] mx-auto px-4">
        <h1 className="text-3xl md:text-6xl font-[450] mb-4">
          Bridge Bitcoin <span className="bg-gradient-to-r from-[#FFB501] to-[#FF8614] text-transparent bg-clip-text">Ordinals</span> to Core Chain
        </h1>
        <p className="text-sm md:text-2xl mb-6 text-gray-400 max-w-[600px] mx-auto">
          Experience seamless trading of Bitcoin Ordinals with lower fees and faster transactions on Core Chain.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          {/* Start Bridging Button with Gradient Border */}
          <button className="relative rounded-full px-6 py-2 text-lg text-black w-fit group">
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FFB501] to-[#FF8614] p-[2px]"></span>
            <span className="relative flex items-center justify-center w-full h-full rounded-full transition-all">
              Start Bridging
            </span>
          </button>
          <button className="w-fit rounded-full border-2 border-gray-600/50 px-6 py-2 text-lg text-white hover:bg-gray-100 hover:text-black transition-all duration-300">
            Explore Market
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
