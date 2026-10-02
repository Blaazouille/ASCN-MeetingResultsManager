/**
 * Responsabilité : réglage « Notre club » de Paramètres (liste des clubs du meeting ouvert, ou champ texte sans résultats).
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : la possibilité de corriger le club mis en avant sans nouvelle version de l'application.
 */
import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import type { Meeting } from '@/lib/db';
import { ourClubChoices } from '@/lib/our-club';
import { saveOurClub, useOurClub, useOurClubUnread } from '@/hooks/use-our-club';
import { useMeetingRows } from '@/hooks/use-meeting-rows';
import { Button } from '@/components/ui/Button';

export interface OurClubSectionProps {
  meeting: Meeting | null;
}

const FIELD_CLASS =
  'mt-1.5 h-11 w-full rounded-sm border-[1.5px] border-line-strong px-3.5 text-base text-ink outline-none focus:border-bassin-strong';

export function OurClubSection({ meeting }: OurClubSectionProps): JSX.Element {
  const ourClub = useOurClub();
  const unread = useOurClubUnread();
  // The list only makes sense once a file is imported; before that, or with no
  // meeting open, the volunteer types the name.
  const hasResults = meeting !== null && meeting.resultCount > 0;
  const { rows, isLoading } = useMeetingRows(hasResults ? meeting.id : null);
  const choices = useMemo(() => ourClubChoices(rows.map((row) => row.club), ourClub), [rows, ourClub]);
  // While the clubs load, the list is still empty: « non trouvé » would be a false alarm.
  const missing = choices.missing && !isLoading;
  // null = untouched: the field shows the saved club, even when it arrives after the first render.
  const [draft, setDraft] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const value = draft ?? (hasResults ? choices.selected : ourClub);
  const canSave = draft !== null && draft.trim() !== '';

  function edit(next: string): void {
    setDraft(next);
    setSavedAt(null);
  }

  async function handleSave(): Promise<void> {
    if (!canSave) return;
    setError(null);
    try {
      await saveOurClub(draft);
      setDraft(null);
      setSavedAt(Date.now());
    } catch (err) {
      console.error('Our club not saved:', err);
      setError("Le club n'a pas pu être enregistré. Réessayez.");
    }
  }

  return (
    <div className="space-y-4 rounded-lg bg-surface-raised p-6 shadow-card">
      <h2 className="font-display text-2xl font-bold text-marine">Notre club</h2>
      <div>
        <label htmlFor="our-club" className="block text-sm font-semibold text-ink">
          Club mis en avant dans les classements et les exports
        </label>
        {hasResults ? (
          <select
            id="our-club"
            value={value}
            disabled={isLoading}
            onChange={(event) => edit(event.target.value)}
            className={FIELD_CLASS}
          >
            {choices.clubs.map((club) => (
              <option key={club} value={club}>
                {missing && club === ourClub ? `${club} (non trouvé dans ce meeting)` : club}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="our-club"
            type="text"
            value={value}
            onChange={(event) => edit(event.target.value)}
            className={FIELD_CLASS}
          />
        )}
        <p className="mt-1.5 text-sm text-ink-muted">
          {hasResults
            ? 'Choisissez notre club parmi ceux des résultats de ce meeting.'
            : 'Écrivez le nom exactement comme dans le fichier de la FFN (les majuscules ne comptent pas).'}
        </p>
        {hasResults && missing && draft === null && (
          <p className="mt-1.5 text-sm font-semibold text-corail-strong">
            {ourClub} n'apparaît pas dans les résultats de ce meeting&nbsp;: choisissez notre club dans la liste.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="primary" icon={Save} disabled={!canSave} onClick={handleSave}>
          Enregistrer
        </Button>
        {savedAt && <span className="text-sm text-success">Club enregistré.</span>}
      </div>
      {unread && (
        <p className="text-sm text-ink-muted">
          Le club enregistré n'a pas pu être lu&nbsp;: {ourClub} est affiché par défaut. Rouvrez cet écran pour réessayer.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-error">{error}</p>}
    </div>
  );
}
