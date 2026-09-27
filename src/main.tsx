import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// ロゴ・見出し用のフォント（使う文字の分だけ読み込まれます）
import '@fontsource/dela-gothic-one/latin.css';
import '@fontsource/dela-gothic-one/japanese.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
