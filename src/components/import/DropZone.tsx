/**
 * Responsabilité : zone de drag & drop / sélection de fichier CSV.
 * Appelé par : ImportPage.tsx.
 * Suppression casserait : l'entrée du flux d'import CSV.
 */
import { useCallback, useEffect, useRef, useState, type DragEvent, type ChangeEvent, type Ref } from 'react';
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface DropZoneProps {
  /** Called once a .csv file has been dropped or selected and "processed". */
  onFileAccepted?: (file: File) => void | Promise<void>;
  /** Called when a non-CSV file is dropped or selected. */
  onFileRejected?: (file: File) => void;
  /** Smaller horizontal version, shown under a successful import. */
  compact?: boolean;
  /** Last error to show inside the zone (rejected file, unreadable CSV…). */
  error?: string | null;
  /** Changes on every error so the zone shakes again even when the message is the same. */
  errorId?: number;
  /** The « Parcourir… » button, for a screen that hands focus back to it (cancelled import). */
  browseRef?: Ref<HTMLButtonElement>;
  className?: string;
}

// Horizontal shake played on each error. Web Animations API rather than a CSS class: calling it again restarts the shake, no reflow trick needed.
const SHAKE_KEYFRAMES = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-10px)' },
  { transform: 'translateX(10px)' },
  { transform: 'translateX(-8px)' },
  { transform: 'translateX(8px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(0)' },
];

type DropZoneState = 'idle' | 'dragover' | 'processing';

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv');
}

export function DropZone({ onFileAccepted, onFileRejected, compact = false, error = null, errorId = 0, browseRef, className }: DropZoneProps): JSX.Element {
  const [state, setState] = useState<DropZoneState>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // errorId lives in AppShell and survives navigation: only a new error shakes, not a remount showing an old one.
  const lastShakenId = useRef(errorId);
  useEffect(() => {
    if (errorId === lastShakenId.current) return;
    lastShakenId.current = errorId;
    // Respects the OS setting: the global CSS rule only covers CSS animations, not this one.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    zoneRef.current?.animate(SHAKE_KEYFRAMES, { duration: 450, easing: 'ease-in-out' });
  }, [errorId]);

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
    <>
      {/* Live region outside the role="button" zone: a button's children are presentational, so an alert inside it may never be announced. */}
      <p role="alert" className="sr-only">
        {error}
      </p>
      <div
        ref={zoneRef}
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
          state === 'dragover' && 'border-bassin-strong bg-bassin-soft',
          state !== 'dragover' && (error ? 'border-error bg-error-light' : 'border-line-strong'),
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
              {error && (
                <span aria-hidden className="flex items-start gap-2 pb-1 text-[17px] font-bold text-error">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  {error}
                </span>
              )}
              <span className="text-[17px] font-semibold text-ink">
                {compact ? 'Nouvelle version du fichier ?' : 'Déposez le fichier CSV extraNat ici'}
              </span>
              <span className="text-[15px] text-ink-muted">
                {compact
                  ? 'Glissez-la ici : les résultats de ce meeting seront mis à jour, sans doublons.'
                  : "ou choisissez-le sur l'ordinateur."}
              </span>
            </span>
            <Button
              ref={browseRef}
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
    </>
  );
}
