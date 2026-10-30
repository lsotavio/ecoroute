import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RioApp } from './RioApp';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Elemento raiz '#root' não encontrado no DOM.");
}

createRoot(rootElement).render(
  <StrictMode>
    <RioApp />
  </StrictMode>
);
