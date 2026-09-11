import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ModelRouter: React.FC = () => {
  const [activeModel, setActiveModel] = useState(0);
  
  const models = [
    { type: 'GENERAL', name: 'Gemma 3:4b', desc: 'Standard conversational tasks' },
    { type: 'REASONING', name: 'Qwen 3:4b', desc: 'Complex logic and multi-step tasks' },
    { type: 'CODING', name: 'Qwen2.5-Coder', desc: 'Development and script generation' },
    { type: 'VISION', name: 'Llava (Planned)', desc: 'Image analysis and OCR grounding' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModel((prev) => (prev + 1) % models.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [models.length]);

  return (
    <section className="py-32 bg-[#F5F3EE] overflow-hidden">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <div>
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-display text-[#111111] mb-6"
            >
              THE RIGHT MODEL.<br/>
              FOR THE RIGHT TASK.
            </motion.h2>
            <p className="text-[#6F6B63] mb-8 font-light max-w-md">
              SOVEREIGN does not rely on a single model. The intelligent Model Router analyzes incoming tasks and dynamically directs them to the most capable local model available in your environment.
            </p>
            
            <div className="space-y-4">
              {models.map((model, idx) => (
                <div 
                  key={idx}
                  className={`p-4 border transition-all duration-500 ${
                    activeModel === idx 
                      ? 'border-[#B99A5B] bg-white shadow-sm' 
                      : 'border-[#D8D4CC] bg-transparent opacity-60'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-xs font-semibold tracking-wider text-[#111111]">{model.type}</span>
                    <span className={`text-xs ${activeModel === idx ? 'text-[#B99A5B]' : 'text-transparent'}`}>
                      ● ACTIVE
                    </span>
                  </div>
                  <div className="text-[#6F6B63] text-sm flex justify-between">
                    <span>{model.desc}</span>
                    <span className="font-mono">{model.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Visual Router */}
          <div className="relative h-[400px] w-full flex items-center justify-center">
            {/* Router Core */}
            <div className="absolute z-20 bg-white border border-[#111111] p-6 shadow-lg">
              <span className="font-mono text-sm tracking-widest font-bold">MODEL ROUTER</span>
            </div>
            
            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full z-10" style={{ pointerEvents: 'none' }}>
              <AnimatePresence>
                <motion.path
                  key={activeModel}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  d={
                    activeModel === 0 ? "M 200,200 L 400,50" :
                    activeModel === 1 ? "M 200,200 L 450,150" :
                    activeModel === 2 ? "M 200,200 L 450,250" :
                    "M 200,200 L 400,350"
                  }
                  stroke="#B99A5B"
                  strokeWidth="2"
                  fill="none"
                  className="hidden lg:block"
                  style={{ transformOrigin: 'center', transform: 'translate(10%, 0)' }}
                />
              </AnimatePresence>
            </svg>
            
            {/* Floating Nodes (simplified representation) */}
            <div className="absolute right-0 flex flex-col space-y-8 z-20 hidden lg:flex">
              {models.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                    activeModel === idx ? 'bg-[#B99A5B] border-[#B99A5B] scale-150' : 'bg-transparent border-[#D8D4CC]'
                  }`}
                />
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default ModelRouter;
