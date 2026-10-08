import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { mockControls } from './api/mock/mockApi';
import './styles.css';

// Prototype switches in the page URL (before the #), e.g. /?latency=8000 or /?offline=1,
// so screenshots of the loading and network-failure states can be taken from a link.
const params = new URLSearchParams(window.location.search);
if (params.has('latency')) mockControls.latencyMs = Math.max(0, Number(params.get('latency')) || 0);
if (params.get('offline') === '1') mockControls.offline = true;
if (params.get('theme') === 'dark' || params.get('theme') === 'light') {
  document.documentElement.dataset.theme = params.get('theme')!;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
