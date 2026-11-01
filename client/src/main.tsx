import '@fontsource-variable/bricolage-grotesque/opsz.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { unlockAudio } from './lib/sound';
import { initViewport } from './lib/viewport';
import { GameProvider } from './state/game';

initViewport();
// O áudio só pode ser ligado depois de um toque na tela.
window.addEventListener('pointerdown', unlockAudio, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
);
