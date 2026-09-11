import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';

const container = document.getElementById('root');

if (!container) {
    throw new Error('Root element #root was not found');
}

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
    });
}
