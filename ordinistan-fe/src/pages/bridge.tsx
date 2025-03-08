import type { NextPage } from 'next';
import Head from 'next/head';
import { FiArrowRight } from 'react-icons/fi';

const Bridge: NextPage = () => {
  return (
    <>
      <Head>
        <title>Bridge - Ordinistan</title>
        <meta name="description" content="Bridge your Bitcoin Ordinals to Core Chain" />
      </Head>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-core-primary to-core-secondary 
                         bg-clip-text text-transparent mb-4">
              Bridge Your Ordinals
            </h1>
            <p className="text-core-muted">Transfer your Bitcoin Ordinals to Core Chain seamlessly</p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8
                         border border-white/50 shadow-lg">
            <div className="space-y-6">
              {/* From Chain */}
              <div>
                <label className="block text-sm font-medium text-core-dark mb-2">From</label>
                <select className="w-full p-3 rounded-xl border border-gray-200 focus:border-core-primary outline-none">
                  <option value="bitcoin">Bitcoin</option>
                </select>
              </div>

              {/* To Chain */}
              <div>
                <label className="block text-sm font-medium text-core-dark mb-2">To</label>
                <select className="w-full p-3 rounded-xl border border-gray-200 focus:border-core-primary outline-none">
                  <option value="core">Core Chain</option>
                </select>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-sm font-medium text-core-dark mb-2">Select Ordinal</label>
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-core-muted text-center">Connect wallet to view your Ordinals</p>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full py-4 bg-gradient-to-r from-core-primary to-core-secondary 
                               text-white rounded-xl font-medium hover:shadow-lg hover:shadow-core-primary/25
                               transition-all flex items-center justify-center gap-2">
                Start Bridge
                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Bridge; 