import { useState, type FormEvent } from 'react';
import type { Meeting, MeetingInput, MeetingStatus } from '@/lib/db';
import { ALL_CATEGORIES } from '@/lib/ranking-engine';
import { TOP_N_OPTIONS, type TopN } from '@/hooks/use-ranking';
import { cn } from '@/lib/utils';

export interface SettingsFormProps {
  meeting: Meeting;
  onSave: (input: Partial<MeetingInput>) => void | Promise<void>;
}

const DEFAULT_TOP_N: TopN = 5;

function categoryLabel(category: string): string {
  return category.replace(/^Classement\s+/i, '');
}

export function SettingsForm({ meeting, onSave }: SettingsFormProps): JSX.Element {
  const [name, setName] = useState(meeting.name);
  const [date, setDate] = useState(meeting.date);
  const [location, setLocation] = useState(meeting.location ?? '');
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
    setActiveCategories((current) =>
      current.includes(category) ? current.filter((entry) => entry !== category) : [...current, category]
    );
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
        date,
        location: location || null,
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
        <div className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary-800">
            Informations meeting
          </h2>
          <div>
            <label htmlFor="settings-name" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
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
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="settings-date" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Date
            </label>
            <input
              id="settings-date"
              type="date"
              required
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSavedAt(null);
              }}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="settings-location" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Lieu (optionnel)
            </label>
            <input
              id="settings-location"
              type="text"
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setSavedAt(null);
              }}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            />
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500">Statut</span>
            <div className="mt-2 flex gap-2">
              {(['provisional', 'final'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setStatus(option);
                    setSavedAt(null);
                  }}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150',
                    status === option
                      ? 'bg-secondary-600 text-neutral-0'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  )}
                >
                  {option === 'provisional' ? 'Provisoire' : 'Définitif'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-primary-800">
            Règles de calcul
          </h2>
          <div>
            <label htmlFor="settings-top-n" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Top N nageurs par club
            </label>
            <select
              id="settings-top-n"
              value={defaultTopN}
              onChange={(event) => {
                setDefaultTopN(Number(event.target.value) as TopN);
                setSavedAt(null);
              }}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            >
              {TOP_N_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-xs font-medium uppercase tracking-wide text-neutral-500">Catégories actives</span>
            <div className="mt-2 space-y-2">
              {ALL_CATEGORIES.map((category) => (
                <label key={category} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={activeCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 rounded border-neutral-300 text-secondary-600 focus:ring-secondary-400"
                  />
                  {categoryLabel(category)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="settings-min-swimmers" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
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
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {savedAt && !error && <p className="text-sm text-success">Paramètres enregistrés.</p>}

      <div className="flex items-center justify-between">
        <button type="button" onClick={resetRankingRules} className="text-sm font-medium text-secondary-700 hover:underline">
          Réinitialiser les valeurs par défaut
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-accent-700 disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}
