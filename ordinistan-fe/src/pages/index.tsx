import type { NextPage } from 'next';
import Head from 'next/head';
// import HeroSection from '../components/home/HeroSection';
import Figures from "../components/home/Figures";
import WhyChooseUs from "../components/home/WhyChooseUs";
// import FeaturedOrdinals from "../components/home/FeaturedOrdinals";
import Hero from '../components/home/Hero';
import FeaturesSection from '../components/home/FeaturesSection';
import StatsSection from '../components/home/StatsSection';
import FeaturedNFTs from '../components/home/FeaturedNFTs';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Ordinistan - Bitcoin Ordinals Bridge to Core Chain</title>
        <meta name="description" content="Bridge your Bitcoin Ordinals to Core Chain and trade them seamlessly" />
      </Head>

      <Hero />
      <Figures />
      <WhyChooseUs />
      <FeaturedNFTs />
    </>
  );
};

export default Home;
