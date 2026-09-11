import React from 'react';
import { motion } from 'framer-motion';

const RagVisualization: React.FC = () => {
  return (
    <section className="py-32 bg-[#FFFFFF] border-t border-[#D8D4CC]">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display text-[#111111]"
          >
            TURN PRIVATE DOCUMENTS<br/>
            INTO LOCAL KNOWLEDGE.
          </motion.h2>
        </div>

        <div className="relative max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between mt-12">
          
          {/* Documents */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col space-y-4 mb-8 md:mb-0 relative"
          >
            <div className="w-32 h-40 bg-white border border-[#D8D4CC] shadow-sm transform -rotate-6 absolute -left-4 top-2 z-0"></div>
            <div className="w-32 h-40 bg-white border border-[#D8D4CC] shadow-md relative z-10 flex flex-col p-4">
              <div className="w-full h-1 bg-[#D8D4CC] mb-2"></div>
              <div className="w-3/4 h-1 bg-[#D8D4CC] mb-2"></div>
              <div className="w-full h-1 bg-[#D8D4CC] mb-2"></div>
              <div className="w-5/6 h-1 bg-[#D8D4CC] mb-6"></div>
              <span className="font-mono text-[10px] text-[#B99A5B] mt-auto">CONFIDENTIAL</span>
            </div>
          </motion.div>

          {/* Flow Line */}
          <div className="hidden md:flex flex-1 h-px bg-[#D8D4CC] mx-8 relative items-center justify-center">
            <motion.div 
              className="absolute w-24 h-px bg-gradient-to-r from-transparent via-[#B99A5B] to-transparent"
              animate={{ left: ['0%', '100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
            
            <div className="bg-[#FFFFFF] px-4 py-2 border border-[#111111] z-10">
              <span className="font-mono text-xs font-bold tracking-widest">OCR & CHUNKING</span>
            </div>
          </div>

          {/* Embeddings / Vector Store */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8 md:mb-0"
          >
            <div className="grid grid-cols-4 gap-2">
              {[...Array(16)].map((_, i) => (
                <motion.div 
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, delay: Math.random() * 2 }}
                  className="w-6 h-6 border border-[#B99A5B] bg-[#B99A5B] bg-opacity-10"
                />
              ))}
            </div>
            <div className="text-center mt-4">
              <span className="font-mono text-[10px] tracking-widest text-[#6F6B63]">VECTOR STORE</span>
            </div>
          </motion.div>

          {/* Flow Line 2 */}
          <div className="hidden md:flex flex-1 h-px bg-[#D8D4CC] mx-8 relative items-center justify-center">
            <motion.div 
              className="absolute w-24 h-px bg-gradient-to-r from-transparent via-[#B99A5B] to-transparent"
              animate={{ left: ['0%', '100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }}
            />
            <div className="bg-[#FFFFFF] px-4 py-2 border border-[#111111] z-10">
              <span className="font-mono text-xs font-bold tracking-widest">RETRIEVAL</span>
            </div>
          </div>

          {/* Output Answer */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-48 bg-white border border-[#B99A5B] shadow-lg p-6 relative"
          >
            <div className="flex items-center space-x-2 mb-4">
              <span className="landing-indicator-dot active"></span>
              <span className="font-mono text-[10px] text-[#B99A5B]">SYNTHESIZED ANSWER</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-[#111111]"></div>
              <div className="h-2 w-5/6 bg-[#111111]"></div>
              <div className="h-2 w-full bg-[#111111]"></div>
              <div className="h-2 w-4/6 bg-[#111111]"></div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#D8D4CC]">
              <span className="font-mono text-[9px] text-[#6F6B63]">CITATION: [DOC-A, P.42]</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default RagVisualization;
