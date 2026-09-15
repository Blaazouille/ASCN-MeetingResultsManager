import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropZoneProps {
  /** Called once a .csv file has been dropped or selected and "processed". */
  onFileAccepted?: (file: File) => void | Promise<void>;
  /** Called when a non-CSV file is dropped or selected. */
  onFileRejected?: (file: File) => void;
  className?: string;
}

type DropZoneState = 'idle' | 'dragover' | 'processing';

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv');
}

export function DropZone({ onFileAccepted, onFileRejected, className }: DropZoneProps): JSX.Element {
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
        'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-13 text-center transition-colors duration-150',
        state === 'idle' && 'border-neutral-300 bg-neutral-0',
        state === 'dragover' && 'animate-pulse border-secondary-400 bg-secondary-50',
        state === 'processing' && 'cursor-wait border-neutral-300 bg-neutral-0',
        state !== 'processing' && 'cursor-pointer',
        className
      )}
    >
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleInputChange} />

      {state === 'processing' ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-secondary-600" aria-hidden />
          <p className="font-body text-sm font-medium text-neutral-700">Analyse du fichier…</p>
        </>
      ) : (
        <>
          <FileUp
            className={cn('h-10 w-10', state === 'dragover' ? 'text-secondary-600' : 'text-neutral-400')}
            aria-hidden
          />
          <p className="font-body text-sm font-medium text-neutral-700">
            Déposez votre fichier CSV extraNat ici
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleBrowseClick();
            }}
            className="rounded-md bg-primary-800 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-primary-700"
          >
            Parcourir
          </button>
        </>
      )}
    </div>
  );
}
