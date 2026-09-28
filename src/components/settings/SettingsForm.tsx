/**
 * Responsabilité : formulaire de configuration du meeting et des règles de calcul (top N, catégories, seuil).
 * Appelé par : SettingsPage.tsx.
 * Suppression casserait : l'écran de paramètres.
 */
import { useState, type FormEvent } from 'react';
import type { Meeting, MeetingInput, MeetingStatus } from '@/lib/db';
import { ALL_CATEGORIES } from '@/lib/ranking-engine';
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';
import { cn } from '@/lib/utils';
import { Segmented, type SegmentedOption } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { categoryShortLabel } from '@/lib/ui-labels';

export interface SettingsFormProps {
  meeting: Meeting;
  onSave: (input: Partial<MeetingInput>) => void | Promise<void>;
}

const DEFAULT_TOP_N: TopN = 5;

const STATUS_OPTIONS: ReadonlyArray<SegmentedOption<MeetingStatus>> = [
  { value: 'provisional', label: 'Provisoire' },
  { value: 'final', label: 'Définitif' },
] as const;

export function SettingsForm({ meeting, onSave }: SettingsFormProps): JSX.Element {
  const [name, setName] = useState(meeting.name);
  const [status, setStatus] = useState<MeetingStatus>(meeting.status);
  const [defaultTopN, setDefaultTopN] = useState<TopN>(
    (TOP_N_OPTIONS as readonly number[]).includes(meeting.defaultTopN) ? (meeting.defaultTopN as TopN) : DEFAULT_TOP_N
  );
  const [activeCategories, setActiveCategories] = useState<string[]>(
    meeting.activeCategories ?? [...ALL_CATEGORIES]
  );
  const [minSwimmers, setMinSwimmers] = useState<string>(
    meeting.minSwimmers > 0 ? String(meeting.minSwimmers) : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (category: string): void => {
    setActiveCategories((current) => {
      const isActive = current.includes(category);
      // At least one category must stay active — an empty selection would
      // silently fall back to "all categories" downstream (resolveActiveCategories),
      // discarding the user's choice with no feedback.
      if (isActive && current.length === 1) {
        return current;
      }
      return isActive ? current.filter((entry) => entry !== category) : [...current, category];
    });
    setSavedAt(null);
  };

  const resetRankingRules = (): void => {
    setDefaultTopN(DEFAULT_TOP_N);
    setMinSwimmers('');
    setActiveCategories([...ALL_CATEGORIES]);
    setSavedAt(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name,
        status,
        defaultTopN,
        minSwimmers: minSwimmers === '' ? 0 : Number(minSwimmers),
        activeCategories: activeCategories.length === ALL_CATEGORIES.length ? null : activeCategories,
      });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg bg-surface-raised p-6 shadow-card">
          <h2 className="font-display text-2xl font-bold text-marine">Informations meeting</h2>
          <div>
            <label htmlFor="settings-name" className="block text-sm font-semibold text-ink">
              Nom du meeting
            </label>
            <input
              id="settings-name"
              type="text"
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSavedAt(null);
              }}
              className="mt-1.5 h-11 w-full rounded-sm border-[1.5px] border-line-strong px-3.5 text-base text-ink outline-none focus:border-bassin-strong"
            />
          </div>
          <Segmented
            label="Statut"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(next) => {
              setStatus(next);
              setSavedAt(null);
            }}
          />
        </div>

        <div className="space-y-4 rounded-lg bg-surface-raised p-6 shadow-card">
          <h2 className="font-display text-2xl font-bold text-marine">Règles de calcul</h2>
          <div>
            <label htmlFor="settings-top-n" className="block text-sm font-semibold text-ink">
              Nageurs comptés par club
            </label>
            <select
              id="settings-top-n"
              value={defaultTopN}
              onChange={(event) => {
                setDefaultTopN(Number(event.target.value) as TopN);
                setSavedAt(null);
              }}
              className="mt-1.5 h-11 w-full rounded-sm border-[1.5px] border-line-strong px-3.5 text-base text-ink outline-none focus:border-bassin-strong"
            >
              {TOP_N_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-sm font-semibold text-ink">Catégories actives</span>
            <div className="mt-2 space-y-2">
              {ALL_CATEGORIES.map((category) => {
                const isChecked = activeCategories.includes(category);
                const isLastActive = isChecked && activeCategories.length === 1;
                return (
                  <label
                    key={category}
                    className={cn(
                      'flex min-h-11 items-center gap-2 text-sm',
                      isLastActive ? 'text-ink-muted opacity-60' : 'text-ink'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isLastActive}
                      onChange={() => toggleCategory(category)}
                      className="h-5 w-5 accent-[var(--color-marine)] disabled:cursor-not-allowed"
                    />
                    {categoryShortLabel(category)}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="settings-min-swimmers" className="block text-sm font-semibold text-ink">
              Seuil minimum de nageurs par club (optionnel)
            </label>
            <input
              id="settings-min-swimmers"
              type="number"
              min={0}
              value={minSwimmers}
              onChange={(event) => {
                setMinSwimmers(event.target.value);
                setSavedAt(null);
              }}
              placeholder="Aucun seuil"
              className="mt-1.5 h-11 w-full rounded-sm border-[1.5px] border-line-strong px-3.5 text-base text-ink outline-none focus:border-bassin-strong"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {savedAt && !error && <p className="text-sm text-success">Paramètres enregistrés.</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={resetRankingRules}
          className="inline-flex h-11 items-center text-sm font-semibold text-bassin-strong underline-offset-2 hover:underline"
        >
          Réinitialiser les valeurs par défaut
        </button>
        <Button type="submit" variant="primary" disabled={isSaving}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
