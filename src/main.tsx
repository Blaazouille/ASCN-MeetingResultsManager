/**
 * Responsabilité : point d'entrée React (monte l'App dans le DOM).
 * Appelé par : index.html via Vite.
 * Suppression casserait : le rendu de toute l'interface.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
