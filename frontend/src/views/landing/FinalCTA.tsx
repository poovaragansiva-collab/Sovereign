import React from 'react';
import { motion } from 'framer-motion';

const FinalCTA: React.FC = () => {
  return (
    <section className="py-32 bg-[#F5F3EE] relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#B99A5B] opacity-5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
      
      <div className="container mx-auto px-8 max-w-4xl text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mb-6 inline-block">
            <span className="font-mono text-xs tracking-[0.2em] text-[#B99A5B] font-bold uppercase">
              Ready to deploy
            </span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-display text-[#111111] mb-8 leading-[1.1]">
            RECLAIM YOUR<br/>
            DATA SOVEREIGNTY.
          </h2>
          
          <p className="text-[#6F6B63] mb-12 text-lg max-w-2xl mx-auto font-light">
            Stop sending confidential information to external APIs. Run powerful language models securely on your own hardware with the SOVEREIGN workbench.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <a href="/login" className="landing-button">
              Access Workbench
            </a>
            <a href="/docs" className="landing-button-outline">
              Read Documentation
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
