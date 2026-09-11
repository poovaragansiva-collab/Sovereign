import React from 'react';
import { motion, MotionValue, useTransform } from 'framer-motion';

interface ProductPreviewProps {
  scrollY: MotionValue<number>;
}

const ProductPreview: React.FC<ProductPreviewProps> = ({ scrollY }) => {
  // Parallax effect on the "image"
  const yImage = useTransform(scrollY, [1500, 2500], [50, -50]);

  return (
    <section id="product" className="py-32 bg-[#FFFFFF]">
      <div className="container mx-auto px-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-4xl md:text-5xl font-display text-[#111111] mb-6">
              A WORKBENCH<br/>
              FOR PROFESSIONALS.
            </h2>
            <p className="text-[#6F6B63] mb-8 font-light text-lg">
              Not another toy chatbot. SOVEREIGN provides an environment designed for heavy technical workflows, output generation, and document analysis.
            </p>
            
            <div className="space-y-6">
              <div className="border-l-2 border-[#B99A5B] pl-4">
                <h3 className="font-mono text-sm tracking-widest text-[#111111] mb-1 font-bold">MULTI-PANEL LAYOUT</h3>
                <p className="text-sm text-[#6F6B63]">Work with chat, context, and generated outputs side-by-side.</p>
              </div>
              <div className="border-l-2 border-[#D8D4CC] pl-4">
                <h3 className="font-mono text-sm tracking-widest text-[#111111] mb-1 font-bold">OUTPUT STUDIO</h3>
                <p className="text-sm text-[#6F6B63]">Generate formatted code, PDFs, and Markdown directly.</p>
              </div>
              <div className="border-l-2 border-[#D8D4CC] pl-4">
                <h3 className="font-mono text-sm tracking-widest text-[#111111] mb-1 font-bold">LOCAL KNOWLEDGE BASES</h3>
                <p className="text-sm text-[#6F6B63]">Upload PDFs securely without them leaving your PC.</p>
              </div>
            </div>
            
            <div className="mt-10">
              <a href="/login" className="landing-button">
                Open Application UI
              </a>
            </div>
          </motion.div>
          
          <motion.div 
            style={{ y: yImage }}
            className="order-1 lg:order-2 w-full h-[500px] bg-[#F5F3EE] border border-[#D8D4CC] shadow-2xl relative overflow-hidden flex flex-col"
          >
            {/* Fake Window Header */}
            <div className="h-8 border-b border-[#D8D4CC] flex items-center px-4 space-x-2 bg-white">
              <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]"></div>
              <div className="mx-auto font-mono text-[9px] text-[#6F6B63]">SOVEREIGN WORKBENCH</div>
            </div>
            
            {/* Fake App Body */}
            <div className="flex-1 flex">
              {/* Sidebar */}
              <div className="w-16 border-r border-[#D8D4CC] bg-white flex flex-col items-center py-4 space-y-4">
                <div className="w-8 h-8 rounded bg-[#F5F3EE] border border-[#D8D4CC]"></div>
                <div className="w-8 h-8 rounded bg-[#B99A5B] bg-opacity-20 border border-[#B99A5B]"></div>
                <div className="w-8 h-8 rounded bg-[#F5F3EE] border border-[#D8D4CC]"></div>
              </div>
              
              {/* Main Area */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-6 relative">
                  <div className="w-3/4 h-16 bg-white border border-[#D8D4CC] mb-4 shadow-sm"></div>
                  <div className="w-1/2 h-24 bg-white border border-[#B99A5B] shadow-sm self-end ml-auto"></div>
                  
                  {/* Floating badge */}
                  <div className="absolute bottom-6 right-6 bg-[#111111] text-white px-3 py-1 font-mono text-[10px] tracking-wider shadow-md">
                    LOCAL GENERATION
                  </div>
                </div>
                
                {/* Input Area */}
                <div className="h-20 border-t border-[#D8D4CC] bg-white p-4">
                  <div className="w-full h-full border border-[#D8D4CC] rounded-sm bg-[#F5F3EE]"></div>
                </div>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

export default ProductPreview;
