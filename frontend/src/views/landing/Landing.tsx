import React from 'react';
import Navigation from './Navigation';
import Hero from './Hero';
import Features from './Features';
import Footer from './Footer';

const Landing: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--canvas)' }}>
      <Navigation />
      
      <main style={{ flex: 1 }}>
        <Hero />
        <Features />
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
