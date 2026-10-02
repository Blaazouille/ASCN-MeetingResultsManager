/**
 * Responsabilité : carte « Reprendre » du dernier meeting sur l'Accueil (pastilles « À importer » / « Exemple », clubs, nageurs, dernier import, accès direct).
 * Appelé par : HomePage.tsx.
 * Suppression casserait : l'accès en un clic au meeting du jour.
 */
import { ArrowRight } from 'lucide-react';
import type { Meeting } from '@/lib/db';
import { formatMeetingImportedAt } from '@/lib/export-data';
import { lastImportLabel, meetingStatsLabel } from '@/lib/ui-labels';
import { ImportPendingBadge } from '@/components/ui/ImportPendingBadge';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { cn } from '@/lib/utils';

export interface ResumeMeetingCardProps {
  meeting: Meeting;
  onOpenRanking: () => void;
  onImport: () => void;
}

export function ResumeMeetingCard({ meeting, onOpenRanking, onImport }: ResumeMeetingCardProps): JSX.Element {
  const hasResults = meeting.resultCount > 0;
  const importedAt = formatMeetingImportedAt(meeting);

  return (
    <section
      aria-label="Dernier meeting"
      className={cn(
        'flex flex-wrap items-center justify-between gap-8 rounded-xl bg-marine px-8 py-7 text-on-marine shadow-raised',
        meeting.isDemo && 'border-2 border-dashed border-warning-light'
      )}
    >
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-on-marine-muted">Reprendre</span>
        <span className="font-display text-4xl font-bold leading-none">{meeting.name}</span>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px] text-on-marine-subtle">
          {meeting.isDemo && <DemoBadge />}
          {!hasResults && <ImportPendingBadge />}
          {hasResults && <span>{meetingStatsLabel(meeting.clubCount, meeting.swimmerCount)}</span>}
          {hasResults && importedAt && <span>· {lastImportLabel(importedAt)}</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {hasResults && (
          <button
            type="button"
            onClick={onImport}
            className="inline-flex h-12 items-center rounded-sm border-[1.5px] border-on-marine-faint px-5 text-base font-semibold text-on-marine transition-colors hover:bg-marine-raised"
          >
            Réimporter un CSV
          </button>
        )}
        <button
          type="button"
          onClick={hasResults ? onOpenRanking : onImport}
          className="inline-flex h-12 items-center gap-2 rounded-sm bg-surface-raised px-6 text-base font-bold text-marine transition-colors hover:bg-marine-soft"
        >
          {hasResults ? 'Ouvrir le classement' : 'Importer le CSV'}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </section>
  );
}
