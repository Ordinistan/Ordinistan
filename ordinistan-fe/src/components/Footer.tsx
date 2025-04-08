import Link from 'next/link';
import React from 'react';

const Footer = () => {
  const navigation = {
    main: [
      // { name: 'About', href: '/about' },
      // { name: 'FAQ', href: '/faq' },
      // { name: 'Terms', href: '/terms' },
    ],
    social: [
      {
        name: 'Twitter',
        href: 'https://x.com/Ordinistan',
        icon: (props: React.ComponentProps<'svg'>) => (
          <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
          </svg>
        ),
      }
    ],
  };

  return (
    <footer className="bg-core-surface border-t border-white/5">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <nav className="flex space-x-4" aria-label="Footer">
            {navigation.main.map((item: { name: string; href: string }) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm text-gray-400 hover:text-white"
              >
                {item.name}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4">
            {navigation.social.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-gray-400 hover:text-white"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="sr-only">{item.name}</span>
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </a>
            ))}
            <span className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Ordinistan
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 