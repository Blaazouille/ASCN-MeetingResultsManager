/**
 * Responsabilité : formulaire de création/édition d'un meeting.
 * Appelé par : HomePage.tsx.
 * Suppression casserait : la création et la modification des meetings.
 */
import { useState, type FormEvent } from 'react';
import type { MeetingInput } from '@/lib/db';
import { Button } from '@/components/ui/Button';

export interface MeetingFormProps {
  onSubmit: (input: MeetingInput) => Promise<void>;
}

export function MeetingForm({ onSubmit }: MeetingFormProps): JSX.Element {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 rounded-lg bg-surface-raised p-5 shadow-card">
      <label htmlFor="meeting-name" className="text-[15px] font-semibold text-ink">
        Nom du meeting
      </label>
      <input
        id="meeting-name"
        type="text"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Meeting de la Mer 2027"
        className="h-12 rounded-sm border-[1.5px] border-line-strong px-3.5 text-base text-ink outline-none placeholder:text-ink-muted focus:border-bassin-strong"
      />
      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
        Créer et importer le CSV
      </Button>
    </form>
  );
}
