/**
 * Responsabilité : zone de drag & drop / sélection de fichier CSV.
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : l'entrée du flux d'import CSV.
 */
import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface DropZoneProps {
  /** Called once a .csv file has been dropped or selected and "processed". */
  onFileAccepted?: (file: File) => void | Promise<void>;
  /** Called when a non-CSV file is dropped or selected. */
  onFileRejected?: (file: File) => void;
  /** Smaller horizontal version, shown under a successful import. */
  compact?: boolean;
  className?: string;
}

type DropZoneState = 'idle' | 'dragover' | 'processing';

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv');
}

export function DropZone({ onFileAccepted, onFileRejected, compact = false, className }: DropZoneProps): JSX.Element {
  const [state, setState] = useState<DropZoneState>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isCsvFile(file)) {
        onFileRejected?.(file);
        return;
      }
      setState('processing');
      try {
        await onFileAccepted?.(file);
      } finally {
        setState('idle');
      }
    },
    [onFileAccepted, onFileRejected]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setState('idle');
      const file = event.dataTransfer.files[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setState((current) => (current === 'processing' ? current : 'dragover'));
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setState((current) => (current === 'processing' ? current : 'idle'));
  }, []);

  const handleBrowseClick = useCallback(() => {
    if (state !== 'processing') {
      inputRef.current?.click();
    }
  }, [state]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-busy={state === 'processing'}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleBrowseClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleBrowseClick();
        }
      }}
      className={cn(
        'flex rounded-xl border-2 border-dashed bg-surface-raised transition-colors',
        compact ? 'items-center gap-5 px-8 py-6' : 'flex-col items-center justify-center gap-4 px-8 py-14 text-center',
        state === 'dragover' ? 'border-bassin-strong bg-bassin-soft' : 'border-line-strong',
        state === 'processing' ? 'cursor-wait' : 'cursor-pointer',
        className
      )}
    >
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleInputChange} />

      {state === 'processing' ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-bassin-strong" aria-hidden />
          <p className="text-base font-semibold text-ink">Analyse du fichier…</p>
        </>
      ) : (
        <>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bassin-soft">
            <FileUp className="h-6 w-6 text-bassin-strong" aria-hidden />
          </span>
          <span className={cn('flex flex-col gap-0.5', compact && 'flex-1')}>
            <span className="text-[17px] font-semibold text-ink">
              {compact ? 'Nouvelle version du fichier ?' : 'Déposez le fichier CSV extraNat ici'}
            </span>
            <span className="text-[15px] text-ink-muted">
              {compact
                ? 'Glissez-la ici : les résultats de ce meeting seront mis à jour, sans doublons.'
                : "ou choisissez-le sur l'ordinateur."}
            </span>
          </span>
          <Button
            onClick={(event) => {
              event.stopPropagation();
              handleBrowseClick();
            }}
          >
            Parcourir…
          </Button>
        </>
      )}
    </div>
  );
}
