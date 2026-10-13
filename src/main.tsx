import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './store/store';
import { UIProvider } from './store/ui';
import { ToastProvider } from './components/Toast';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

const el = document.getElementById('root');
if (!el) throw new Error('未找到 #root 容器');

createRoot(el).render(
  <React.StrictMode>
    <StoreProvider>
      <ToastProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </ToastProvider>
    </StoreProvider>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 注册失败不影响使用 */
    });
  });
}
