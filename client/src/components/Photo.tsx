import { useRef, useState, type ReactNode } from 'react';
import { makePhoto } from '../lib/photo';
import { useGame } from '../state/game';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Face } from './ui';

/**
 * Seletor de imagem escondido. No celular, `open()` deixa escolher da galeria ou tirar uma foto na hora.
 * A imagem já sai recortada e reduzida e é salva como sua foto de perfil.
 */
export function usePhotoPicker(onDone?: () => void): { open: () => void; busy: boolean; input: ReactNode } {
  const { setPhoto, toast } = useGame();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const input = (
    <input
      ref={ref}
      className="sr-only"
      type="file"
      accept="image/*"
      tabIndex={-1}
      aria-hidden="true"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        // Limpa para dar para escolher a mesma imagem de novo depois.
        e.target.value = '';
        if (!file) return;
        setBusy(true);
        try {
          const res = await setPhoto(await makePhoto(file));
          if (res.ok) onDone?.();
          else toast(res.message, 'error');
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Não consegui usar essa imagem.', 'error');
        } finally {
          setBusy(false);
        }
      }}
    />
  );

  return { open: () => ref.current?.click(), busy, input };
}

/** Folha para ver, trocar ou tirar a foto de perfil. */
export function PhotoSheet({ color, initial, onClose }: { color: string; initial: string; onClose: () => void }) {
  const { photo, setPhoto, toast } = useGame();
  const picker = usePhotoPicker(onClose);
  const [removing, setRemoving] = useState(false);
  const busy = picker.busy || removing;

  const remove = async () => {
    setRemoving(true);
    const res = await setPhoto(null);
    setRemoving(false);
    if (res.ok) onClose();
    else toast(res.message, 'error');
  };

  return (
    <Sheet title="Foto de perfil" onClose={onClose}>
      <div className="photo-preview">
        <Face photo={photo} color={color} initial={initial} />
      </div>
      <p>{photo ? 'É assim que a galera te vê na sala.' : 'Coloque uma foto para a galera te reconhecer na sala.'}</p>
      <div className="sheet-actions">
        {photo && (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={remove}>
            <Icon name="trash" size={22} />
            <span>Tirar foto</span>
          </button>
        )}
        <button type="button" className="btn btn-primary" disabled={busy} onClick={picker.open} data-autofocus>
          <Icon name="camera" size={22} />
          <span>{picker.busy ? 'Carregando…' : photo ? 'Trocar foto' : 'Escolher foto'}</span>
        </button>
      </div>
      {picker.input}
    </Sheet>
  );
}
