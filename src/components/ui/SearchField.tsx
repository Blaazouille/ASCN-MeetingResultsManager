/**
 * Responsabilité : champ de recherche avec loupe (filtre à la frappe).
 * Appelé par : RankingToolbar.tsx, IndividualPage.tsx.
 * Suppression casserait : la recherche d'un club ou d'un nageur.
 */
import { Search } from 'lucide-react';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Says what to type; also the input's accessible name. */
  placeholder: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps): JSX.Element {
  return (
    <label className="flex h-11 w-full max-w-[300px] items-center gap-2 rounded-sm border-[1.5px] border-line-strong bg-surface-raised px-3 text-ink-muted focus-within:border-bassin-strong">
      <Search className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
      />
    </label>
  );
}
