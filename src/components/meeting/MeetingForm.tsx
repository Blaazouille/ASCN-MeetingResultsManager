/**
 * Responsabilité : formulaire de création/édition d'un meeting.
 * Appelé par : HomePage.tsx, SettingsPage.tsx.
 * Suppression casserait : la création et la modification des meetings.
 */
import { useState, type FormEvent } from 'react';
import type { MeetingInput } from '@/lib/db';

export interface MeetingFormProps {
  onSubmit: (input: MeetingInput) => void | Promise<void>;
  onCancel: () => void;
}

export function MeetingForm({ onSubmit, onCancel }: MeetingFormProps): JSX.Element {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      // Date defaults to today and location stays empty — createMeeting
      // fills the date itself (src/lib/db.ts) when it's omitted. Both can
      // be set precisely afterward from Paramètres; asking for them here
      // just slows down getting to the CSV import, which is the actual
      // first thing a volunteer needs to do.
      await onSubmit({ name });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-neutral-0 p-6 shadow-card">
      <div>
        <label htmlFor="meeting-name" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
          Nom du meeting
        </label>
        <input
          id="meeting-name"
          type="text"
          required
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
          placeholder="Meeting de la Mer 2026"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Date et lieu se règlent ensuite dans Paramètres — la date par défaut est celle d'aujourd'hui.
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-secondary-600 px-4 py-2 text-sm font-medium text-neutral-0 shadow-card transition-colors duration-150 hover:bg-secondary-700 disabled:opacity-60"
        >
          Créer le meeting
        </button>
      </div>
    </form>
  );
}
