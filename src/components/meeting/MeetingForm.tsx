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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name, date, location: location || null });
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
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
          placeholder="Meeting de la Mer 2026"
        />
      </div>
      <div>
        <label htmlFor="meeting-date" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
          Date
        </label>
        <input
          id="meeting-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="meeting-location" className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
          Lieu (optionnel)
        </label>
        <input
          id="meeting-location"
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-secondary-400 focus:outline-none"
          placeholder="Cherbourg-en-Cotentin"
        />
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
