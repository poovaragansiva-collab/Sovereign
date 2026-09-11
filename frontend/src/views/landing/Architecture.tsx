import React from 'react';
import { motion } from 'framer-motion';

const Architecture: React.FC = () => {
  const nodes = [
    { id: 1, label: 'USER', desc: 'Secure local connection via organizational LAN.' },
    { id: 2, label: 'SOVEREIGN', desc: 'The central workbench orchestration layer.' },
    { id: 3, label: 'TASK ANALYZER', desc: 'Deconstructs requests into logical steps.' },
    { id: 4, label: 'MODEL ROUTER', desc: 'Selects the appropriate local model.' },
    { id: 5, label: 'RAG / DOCUMENTS', desc: 'Retrieves relevant private context.' },
    { id: 6, label: 'LOCAL MODELS', desc: 'Executes inference securely.' },
    { id: 7, label: 'VERIFICATION', desc: 'Ensures output quality and correctness.' },
    { id: 8, label: 'OUTPUT', desc: 'Delivers result to the user interface.' }
  ];

  return (
    <section id="architecture" className="py-32 bg-[#FFFFFF]">
      <div className="container mx-auto px-8 max-w-5xl">
        <div className="text-center mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display text-[#111111]"
          >
            ONE WORKBENCH.<br/>
            AN ENTIRE LOCAL AI STACK.
          </motion.h2>
        </div>

        <div className="relative flex flex-col items-center">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#D8D4CC] -translate-x-1/2"></div>
          
          {nodes.map((node, i) => (
            <motion.div 
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              className="relative z-10 flex items-center justify-center w-full mb-12 last:mb-0 group cursor-default"
            >
              <div className="bg-[#FFFFFF] border border-[#D8D4CC] py-3 px-6 rounded-sm shadow-sm transition-all duration-300 group-hover:border-[#B99A5B] group-hover:shadow-md relative">
                <span className="font-mono text-sm tracking-widest text-[#111111] font-medium">{node.label}</span>
                
                {/* Hover Description Tooltip */}
                <div className="absolute left-full ml-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-48 pointer-events-none hidden md:block">
                  <div className="bg-[#111111] text-[#F5F3EE] p-3 rounded-sm text-xs font-light">
                    {node.desc}
                  </div>
                  {/* Triangle pointer */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-[#111111]"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Architecture;
