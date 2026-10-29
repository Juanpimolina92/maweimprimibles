import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import HeroScene from './hero.jsx';

const target = document.getElementById('hero-react-root');
if (target) hydrateRoot(target, <HeroScene />);
