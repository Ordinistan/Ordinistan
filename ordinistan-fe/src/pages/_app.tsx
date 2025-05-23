import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { config } from '../wagmi';
import { BitcoinWalletProvider } from '../utils/BitcoinWalletContext';

const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <BitcoinWalletProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={client}>
          <RainbowKitProvider>
            <div className="min-h-screen flex flex-col bg-core-dark">
              <Navbar />
              <main className="flex-grow w-full">
                <Component {...pageProps} />
              </main>
              <Footer />
            </div>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </BitcoinWalletProvider>
  );
}

export default MyApp;
