import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const root = document.getElementById('frame');
if (!root) throw new Error('Shell is missing its #frame root element');

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
