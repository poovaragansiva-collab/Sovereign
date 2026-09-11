import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0A0A0A] text-[#F5F3EE] py-16 border-t border-[#333333]">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="mb-8 md:mb-0">
            <div className="font-display text-2xl tracking-tight mb-1">
              SOVEREIGN
            </div>
            <div className="font-mono text-[10px] tracking-widest text-[#999999]">
              LOCAL AI WORKBENCH
            </div>
          </div>
          
          <div className="flex space-x-8">
            <a href="/login" className="font-mono text-xs text-[#999999] hover:text-[#B99A5B] transition-colors">
              WORKBENCH
            </a>
            <a href="/docs" className="font-mono text-xs text-[#999999] hover:text-[#B99A5B] transition-colors">
              DOCUMENTATION
            </a>
            <a href="https://github.com" className="font-mono text-xs text-[#999999] hover:text-[#B99A5B] transition-colors">
              GITHUB
            </a>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-[#333333] flex flex-col md:flex-row justify-between items-center">
          <div className="font-mono text-[10px] text-[#666666] mb-4 md:mb-0">
            © {new Date().getFullYear()} SOVEREIGN. ALL RIGHTS RESERVED.
          </div>
          <div className="font-mono text-[10px] text-[#666666]">
            YOUR AI. YOUR INFRASTRUCTURE. YOUR DATA.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
