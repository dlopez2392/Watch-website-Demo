import { useEffect } from 'react';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-sc/500.css';
import '@fontsource/cormorant-sc/600.css';
import '@fontsource/italianno/400.css';
import '@fontsource-variable/jost';
import './styles/global.css';
import './styles/nav.css';
import './styles/hero.css';
import './styles/sections.css';
import { prefersReducedMotion } from './lib/env';
import { ScrollTrigger, initPlates, initReveals, initScroll } from './lib/motion';
import Nav from './sections/Nav';
import Hero from './sections/Hero';
import Movimento from './sections/Movimento';
import Collezione from './sections/Collezione';
import Bottega from './sections/Bottega';
import Storia from './sections/Storia';
import Enquire from './sections/Enquire';
import Footer from './sections/Footer';

export default function App() {
  useEffect(() => {
    if (prefersReducedMotion()) document.documentElement.classList.add('no-motion');
    const stopScroll = initScroll();
    const stopReveals = initReveals();
    const stopPlates = initPlates();
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh);
    return () => {
      stopScroll();
      stopReveals();
      stopPlates();
      window.removeEventListener('load', refresh);
    };
  }, []);

  return (
    <>
      <a className="skip" href="#collezione">
        Skip to the collection
      </a>
      <Nav />
      <main>
        <Hero />
        <Collezione />
        <Movimento />
        <Bottega />
        <Storia />
        <Enquire />
      </main>
      <Footer />
    </>
  );
}
