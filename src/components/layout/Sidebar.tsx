/**
 * Responsabilité : navigation latérale (logo, meeting ouvert, étapes, résultats, paramètres, version).
 * Appelé par : AppShell.tsx.
 * Suppression casserait : la navigation entre écrans.
 */
import { NavLink } from 'react-router-dom';
import { Award, Check, Home, Settings, Upload, User, Users, type LucideIcon } from 'lucide-react';
import logoUrl from '../../../resources/icon.png';
import type { Meeting } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useAppVersion } from '@/hooks/use-app-version';
import { SidebarMeetingCard } from './SidebarMeetingCard';

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
}

const MEETINGS_ENTRY: NavEntry = { to: '/', label: 'Meetings', icon: Home };
const IMPORT_ENTRY: NavEntry = { to: '/import', label: 'Import CSV', icon: Upload };
const RESULT_ENTRIES: readonly NavEntry[] = [
  { to: '/classement', label: 'Par équipes', icon: Users },
  { to: '/individuels', label: 'Individuels', icon: User },
  { to: '/palmares', label: 'Palmarès des rigolos', icon: Award },
];
const SETTINGS_ENTRY: NavEntry = { to: '/parametres', label: 'Paramètres', icon: Settings };

const ITEM_BASE = 'flex h-11 items-center gap-3 rounded-sm px-3 text-[15px] transition-colors';
const SECTION_LABEL = 'px-3 pb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-on-marine-muted';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    ITEM_BASE,
    isActive ? 'bg-surface-raised font-semibold text-marine' : 'font-medium text-on-marine-subtle hover:bg-marine-raised'
  );
}

interface NavItemProps {
  entry: NavEntry;
  enabled: boolean;
  done?: boolean;
}

/** Disabled entries stay visible (greyed): the menu keeps the same shape whether or not a meeting is open. */
function NavItem({ entry, enabled, done = false }: NavItemProps): JSX.Element {
  const Icon = entry.icon;
  const content = (
    <>
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span>{entry.label}</span>
      {done && (
        <span
          className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded-full bg-success-bright text-marine"
          aria-label="terminé"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </span>
      )}
    </>
  );

  if (!enabled) {
    return (
      <span aria-disabled="true" className={cn(ITEM_BASE, 'cursor-not-allowed font-medium text-on-marine-subtle opacity-40')}>
        {content}
      </span>
    );
  }
  return (
    <NavLink to={entry.to} end={entry.to === '/'} className={navLinkClass}>
      {content}
    </NavLink>
  );
}

export interface SidebarProps {
  meeting: Meeting | null;
}

export function Sidebar({ meeting }: SidebarProps): JSX.Element {
  const version = useAppVersion();
  const hasResults = meeting !== null && meeting.resultCount > 0;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-y-0 left-0 z-20 flex w-sidebar flex-col gap-6 overflow-y-auto bg-marine px-4 py-6 text-on-marine"
    >
      <div className="flex items-center gap-3 px-2">
        {/* White tile: the logo's navy half would vanish on the navy sidebar. */}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-raised">
          <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />
        </span>
        <span className="flex flex-col">
          <span className="font-display text-xl font-bold leading-6 tracking-[0.02em]">MDLM Ranking</span>
          <span className="text-[13px] text-on-marine-muted">AS Cherbourg Natation</span>
        </span>
      </div>

      <SidebarMeetingCard meeting={meeting} />

      <div className="flex flex-col gap-1">
        <NavItem entry={MEETINGS_ENTRY} enabled />
      </div>

      <div className="flex flex-col gap-1">
        <span className={SECTION_LABEL}>Données</span>
        <NavItem entry={IMPORT_ENTRY} enabled={meeting !== null} done={hasResults} />
      </div>

      <div className="flex flex-col gap-1">
        <span className={SECTION_LABEL}>Résultats</span>
        {RESULT_ENTRIES.map((entry) => (
          <NavItem key={entry.to} entry={entry} enabled={hasResults} />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        {/* Not gated on a meeting: restoring a backup on a fresh install is the
            one thing you need Paramètres for before any meeting exists. */}
        <NavItem entry={SETTINGS_ENTRY} enabled />
        {version && <span className="px-3 pt-2 text-xs text-on-marine-faint">Version {version}</span>}
      </div>
    </nav>
  );
}
