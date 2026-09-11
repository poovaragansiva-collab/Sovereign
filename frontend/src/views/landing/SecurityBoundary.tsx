import React from 'react';
import { motion } from 'framer-motion';

const SecurityBoundary: React.FC = () => {
  return (
    <section id="security" className="py-32 bg-[#111111] text-[#F5F3EE] overflow-hidden">
      <div className="container mx-auto px-8 max-w-6xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-display text-white mb-6">
              THE AI RUNS INSIDE<br/>
              YOUR BOUNDARY.
            </h2>
            <p className="text-[#999999] mb-8 font-light text-lg">
              Private by architecture. Local by design. SOVEREIGN ensures that sensitive documents, queries, and generated outputs never leave your network.
            </p>
            
            <div className="space-y-4 font-mono text-sm tracking-wider">
              <div className="flex items-center space-x-3 text-[#B99A5B]">
                <span>✓</span>
                <span>LOCAL INFERENCE</span>
              </div>
              <div className="flex items-center space-x-3 text-[#B99A5B]">
                <span>✓</span>
                <span>LOCAL STORAGE</span>
              </div>
              <div className="flex items-center space-x-3 text-[#B99A5B]">
                <span>✓</span>
                <span>ROLE-BASED ACCESS</span>
              </div>
              <div className="flex items-center space-x-3 text-[#B99A5B]">
                <span>✓</span>
                <span>AUDIT LOGGING</span>
              </div>
              <div className="flex items-center space-x-3 text-[#B99A5B]">
                <span>✓</span>
                <span>DOCUMENT ISOLATION</span>
              </div>
            </div>
          </motion.div>
          
          <div className="relative h-[400px] flex items-center justify-center">
            {/* External Cloud (Blurred out / outside boundary) */}
            <div className="absolute top-0 right-0 p-4 opacity-30 pointer-events-none">
              <span className="font-mono text-xs text-white">EXTERNAL CLOUD</span>
              <div className="w-32 h-16 border border-white mt-2 border-dashed"></div>
            </div>

            {/* Security Boundary */}
            <motion.div 
              className="absolute inset-4 border border-[#B99A5B] bg-[#B99A5B] bg-opacity-[0.02]"
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            >
              <div className="absolute -top-3 left-8 bg-[#111111] px-2 font-mono text-[10px] text-[#B99A5B] tracking-widest">
                ORGANIZATIONAL INFRASTRUCTURE
              </div>
              
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="border border-[#F5F3EE] border-opacity-20 p-3 w-24 text-center">
                    <span className="font-mono text-[9px] text-[#999999]">USERS</span>
                  </div>
                  <div className="border border-[#F5F3EE] border-opacity-20 p-3 w-24 text-center">
                    <span className="font-mono text-[9px] text-[#999999]">POSTGRES</span>
                  </div>
                </div>
                
                <div className="w-full bg-white bg-opacity-5 border border-[#F5F3EE] border-opacity-30 p-6 flex items-center justify-center">
                  <span className="font-display text-xl text-white tracking-widest">SOVEREIGN CORE</span>
                </div>
                
                <div className="flex justify-between">
                  <div className="border border-[#F5F3EE] border-opacity-20 p-3 w-24 text-center">
                    <span className="font-mono text-[9px] text-[#999999]">RAG DB</span>
                  </div>
                  <div className="border border-[#B99A5B] bg-[#B99A5B] bg-opacity-10 p-3 w-32 text-center">
                    <span className="font-mono text-[9px] text-[#B99A5B]">LOCAL MODELS (OLLAMA)</span>
                  </div>
                </div>
              </div>
              
              {/* Animated protection pulse */}
              <motion.div 
                className="absolute inset-0 border-2 border-[#B99A5B]"
                animate={{ opacity: [0, 0.5, 0], scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default SecurityBoundary;
