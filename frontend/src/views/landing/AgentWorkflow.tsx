import React from 'react';
import { motion } from 'framer-motion';

const AgentWorkflow: React.FC = () => {
  const steps = [
    { label: 'USER REQUEST', icon: '📝', detail: '"Analyze maintenance report"' },
    { label: 'TASK ANALYSIS', icon: '🔍', detail: 'Deconstructing intent' },
    { label: 'PLANNING', icon: '⚙️', detail: 'Creating execution strategy' },
    { label: 'RAG', icon: '📚', detail: 'Retrieving context' },
    { label: 'LOCAL MODEL', icon: '🧠', detail: 'Reasoning' },
    { label: 'VERIFICATION', icon: '✅', detail: 'Checking output correctness' },
    { label: 'OUTPUT', icon: '📄', detail: 'Verified answer / PDF' }
  ];

  return (
    <section className="py-32 bg-[#F5F3EE] overflow-hidden">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="text-center mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display text-[#111111]"
          >
            NOT JUST CHAT.<br/>
            AGENTIC WORKFLOWS.
          </motion.h2>
        </div>

        <div className="relative pt-12 pb-24 overflow-x-auto custom-scrollbar">
          <div className="min-w-[1000px] flex items-center justify-between relative px-4">
            {/* Background Line */}
            <div className="absolute left-0 right-0 h-px bg-[#D8D4CC] top-1/2 -translate-y-1/2 z-0"></div>
            
            {/* Animated artifact moving across line */}
            <motion.div 
              className="absolute left-0 w-3 h-3 bg-[#B99A5B] rotate-45 z-10 top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(185,154,91,0.5)]"
              animate={{ left: ['0%', '100%'] }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            />

            {steps.map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative z-20 flex flex-col items-center group"
              >
                <div className="w-12 h-12 bg-white border border-[#D8D4CC] flex items-center justify-center rotate-45 mb-6 group-hover:border-[#B99A5B] transition-colors shadow-sm">
                  <div className="-rotate-45 text-lg">{step.icon}</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-xs font-bold tracking-widest text-[#111111] mb-2">{step.label}</div>
                  <div className="text-[10px] text-[#6F6B63] font-light max-w-[120px] mx-auto italic">
                    {step.detail}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgentWorkflow;
