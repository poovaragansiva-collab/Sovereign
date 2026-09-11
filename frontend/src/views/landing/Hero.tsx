import React, { Suspense } from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';
import AIOrbCanvas from './AIOrb';

interface HeroProps {
  scrollY: MotionValue<number>;
}

const Hero: React.FC<HeroProps> = ({ scrollY }) => {
  const yText = useTransform(scrollY, [0, 500], [0, 150]);
  const opacityText = useTransform(scrollY, [0, 300], [1, 0]);
  const yCanvas = useTransform(scrollY, [0, 500], [0, 50]);

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="container mx-auto px-8 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left: Typography */}
        <motion.div 
          style={{ y: yText, opacity: opacityText }}
          className="flex flex-col items-start pt-12"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center space-x-3 mb-6"
          >
            <span className="landing-indicator-dot active"></span>
            <span className="font-mono text-xs tracking-[0.2em] text-[#6F6B63] uppercase">
              Local AI Workbench / Private Compute
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-[#111111] font-display mb-6 tracking-tight"
          >
            AI THAT STAYS<br />
            WHERE YOUR<br />
            DATA LIVES.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-[#6F6B63] text-lg md:text-xl max-w-md mb-10 leading-relaxed font-light"
          >
            SOVEREIGN is a private AI workbench for organizations that cannot afford to move confidential information outside their infrastructure.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <a href="/login" className="landing-button">
              Enter SOVEREIGN
            </a>
            <a href="#architecture" className="landing-button-outline">
              Explore Architecture
            </a>
          </motion.div>
        </motion.div>

        {/* Right: 3D Visualization */}
        <motion.div 
          style={{ y: yCanvas }}
          className="relative h-[600px] w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        >
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-[#6F6B63]">
              [ INITIALIZING LOCAL COMPUTE CORE ]
            </div>
          }>
            <AIOrbCanvas />
          </Suspense>

          {/* Micro details overlay */}
          <div className="absolute top-10 left-10 hidden md:flex items-center space-x-2">
            <span className="landing-indicator-dot"></span>
            <span className="font-mono text-[10px] text-[#6F6B63] tracking-wider uppercase">Local Inference</span>
          </div>
          <div className="absolute bottom-20 left-10 hidden md:flex items-center space-x-2">
            <span className="landing-indicator-dot"></span>
            <span className="font-mono text-[10px] text-[#6F6B63] tracking-wider uppercase">Private RAG</span>
          </div>
          <div className="absolute top-32 right-10 hidden md:flex items-center space-x-2">
            <span className="landing-indicator-dot"></span>
            <span className="font-mono text-[10px] text-[#6F6B63] tracking-wider uppercase">Model Routing</span>
          </div>
          <div className="absolute bottom-32 right-10 hidden md:flex items-center space-x-2">
            <span className="landing-indicator-dot active"></span>
            <span className="font-mono text-[10px] text-[#B99A5B] tracking-wider uppercase">Active</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
