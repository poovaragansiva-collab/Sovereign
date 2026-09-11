import React from 'react';
import { motion } from 'framer-motion';

const Philosophy: React.FC = () => {
  return (
    <section className="py-32 bg-[#F5F3EE] border-t border-[#D8D4CC]">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          
          <motion.div 
            className="md:col-span-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-display leading-[1.1] tracking-tight text-[#111111]">
              YOUR DATA SHOULD NOT HAVE TO TRAVEL TO BECOME INTELLIGENT.
            </h2>
          </motion.div>
          
          <motion.div 
            className="md:col-span-4"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="pl-0 md:pl-8 border-l border-[#D8D4CC]">
              <p className="text-[#6F6B63] mb-6 font-light leading-relaxed text-sm md:text-base">
                SOVEREIGN brings AI processing, document intelligence, retrieval and workflows directly into your organization's own infrastructure. We believe true data sovereignty requires localized compute.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs text-[#111111] uppercase tracking-wider w-24">Processing</span>
                  <span className="font-mono text-xs text-[#B99A5B] uppercase tracking-wider">100% Local</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs text-[#111111] uppercase tracking-wider w-24">Data Egress</span>
                  <span className="font-mono text-xs text-[#B99A5B] uppercase tracking-wider">0 Bytes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs text-[#111111] uppercase tracking-wider w-24">Privacy</span>
                  <span className="font-mono text-xs text-[#B99A5B] uppercase tracking-wider">Air-Gapped Ready</span>
                </div>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

export default Philosophy;
