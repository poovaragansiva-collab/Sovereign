import React, { useEffect, useState } from 'react';
import { useScroll } from 'framer-motion';
import './landing.css';
import Navigation from './Navigation';
import Hero from './Hero';
import Philosophy from './Philosophy';
import Architecture from './Architecture';
import ModelRouter from './ModelRouter';
import RagVisualization from './RagVisualization';
import SecurityBoundary from './SecurityBoundary';
import AgentWorkflow from './AgentWorkflow';
import ProductPreview from './ProductPreview';
import UseCases from './UseCases';
import FinalCTA from './FinalCTA';
import Footer from './Footer';

const Landing: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      <Navigation scrolled={scrolled} />
      
      <main>
        <Hero scrollY={scrollY} />
        <Philosophy />
        <Architecture />
        <ModelRouter />
        <RagVisualization />
        <SecurityBoundary />
        <AgentWorkflow />
        <ProductPreview scrollY={scrollY} />
        <UseCases />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
