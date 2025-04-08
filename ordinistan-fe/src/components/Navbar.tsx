import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import BitcoinConnectButton from "./common/BitcoinConnectButton";

const Navbar = () => {
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "Bridge", href: "/bridge" },
    { name: "Inscribe", href: "/inscribe" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      
      // Make navbar visible when scrolled to top
      if (currentScrollPos === 0) {
        setVisible(true);
        setPrevScrollPos(currentScrollPos);
        return;
      }
      
      // Show when scrolling up, hide when scrolling down
      setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 10);
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  return (
    <nav className={`fixed top-4 left-0 right-0 z-50 flex justify-center transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="flex justify-between items-center px-3 md:px-6 py-3 w-full max-w-[1200px] mx-auto bg-transparent border-2 border-orange-500/20 rounded-2xl backdrop-blur-sm">
        {/* Logo */}
        <div>
          <Link href="/">
            <Image src="/images/main-logo.png" alt="Ordinistan" className="h-5 md:h-8 w-auto" width={100} height={32}/>
          </Link>
        </div>
        {/* Navigation & Wallet Buttons */}
        <div className="flex gap-6 items-center">
          {/* Navigation Links */}
          <div className="hidden md:flex gap-5 text-gray-400 text-sm">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <span className="cursor-pointer">{item.name}</span>
              </Link>
            ))}
          </div>
          {/* Connect Wallet Buttons */}
          <div className="flex items-center gap-2">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              // className="rounded-full border-2 border-gray-600/30 px-4 md:px-6 py-2 text-sm md:text-lg text-white hover:bg-gray-100 hover:text-black transition-all duration-300"
            />
            <BitcoinConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
