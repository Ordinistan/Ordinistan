import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import BitcoinConnectButton from './common/BitcoinConnectButton';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Bridge', href: '/bridge' },
    { name: 'Inscribe', href: '/inscribe' },
  ];

  return (
    <nav className="bg-core-darker/95 backdrop-blur-xl border-b border-white/5 fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/logo.png" 
                alt="Ordinistan" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold text-white">Ordinistan</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex sm:items-center sm:space-x-8">
            <div className="flex space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    router.pathname === item.href
                      ? 'bg-core-primary/10 text-core-primary'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <ConnectButton 
                chainStatus="icon" 
                showBalance={false}
              />
              <BitcoinConnectButton />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-core-primary"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`${
          isOpen ? 'block' : 'hidden'
        } sm:hidden bg-core-darker border-t border-white/5`}
      >
        <div className="pt-2 pb-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-3 py-2 text-base font-medium ${
                router.pathname === item.href
                  ? 'bg-core-primary/10 text-core-primary'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <div className="px-3 py-2 space-y-2">
            <ConnectButton />
            <BitcoinConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 