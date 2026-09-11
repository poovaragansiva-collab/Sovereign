import React from 'react';
import { motion } from 'framer-motion';

interface NavigationProps {
  scrolled: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ scrolled }) => {
  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out px-8 py-4 flex items-center justify-between ${
        scrolled ? 'landing-nav-glass py-3' : 'bg-transparent py-6'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col">
        <a href="/" className="font-display text-2xl tracking-tight hover:opacity-80 transition-opacity">
          SOVEREIGN
        </a>
        <span className="font-mono text-[10px] tracking-widest text-[#6F6B63] mt-0.5">
          LOCAL AI WORKBENCH
        </span>
      </div>

      <div className="hidden md:flex items-center space-x-10">
        <a href="#product" className="text-sm font-medium hover:text-[#B99A5B] transition-colors">Product</a>
        <a href="#architecture" className="text-sm font-medium hover:text-[#B99A5B] transition-colors">Architecture</a>
        <a href="#security" className="text-sm font-medium hover:text-[#B99A5B] transition-colors">Security</a>
        <a href="#use-cases" className="text-sm font-medium hover:text-[#B99A5B] transition-colors">Use Cases</a>
      </div>

      <div className="flex items-center space-x-6">
        <a href="/docs" className="text-sm font-medium text-[#6F6B63] hover:text-[#111111] transition-colors hidden sm:block">
          Documentation
        </a>
        <a href="/login" className="landing-button text-sm">
          Enter Workbench
        </a>
      </div>
    </motion.nav>
  );
};

export default Navigation;
