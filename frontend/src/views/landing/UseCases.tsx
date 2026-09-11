import React from 'react';
import { motion } from 'framer-motion';

const UseCases: React.FC = () => {
  const cases = [
    {
      id: '01',
      title: 'FINANCIAL ANALYSIS',
      desc: 'Query private financial statements and internal cap tables without uploading them to cloud APIs.',
    },
    {
      id: '02',
      title: 'LEGAL CONTRACTS',
      desc: 'Perform semantic search across thousands of privileged legal documents securely.',
    },
    {
      id: '03',
      title: 'PROPRIETARY CODE',
      desc: 'Run coding models against your closed-source repositories without telemetry leakage.',
    }
  ];

  return (
    <section id="use-cases" className="py-32 bg-[#111111] text-[#F5F3EE]">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-[#333333] pb-8">
          <div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-display text-white"
            >
              WHO NEEDS SOVEREIGN?
            </motion.h2>
          </div>
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-6 md:mt-0 font-mono text-xs text-[#999999] tracking-widest uppercase"
          >
            Target Demographics
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cases.map((uc, i) => (
            <motion.div 
              key={uc.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group border border-[#333333] p-8 hover:border-[#B99A5B] transition-colors bg-[#1A1A1A]"
            >
              <div className="font-mono text-3xl font-light text-[#333333] mb-6 group-hover:text-[#B99A5B] transition-colors">
                {uc.id}
              </div>
              <h3 className="font-mono text-sm tracking-widest font-bold text-white mb-4">
                {uc.title}
              </h3>
              <p className="text-[#999999] text-sm leading-relaxed font-light">
                {uc.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
