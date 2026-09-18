/**
 * Responsabilité : navigation latérale entre les écrans de l'application.
 * Appelé par : AppShell.tsx.
 * Suppression casserait : la navigation entre écrans.
 */
import { NavLink } from 'react-router-dom';
import { Award, Home, Settings, Trophy, Upload, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALWAYS_VISIBLE = [{ to: '/', label: 'Accueil', icon: Home }] as const;

const MEETING_ITEMS = [
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/classement', label: 'Classement', icon: Trophy },
  { to: '/individuels', label: 'Individuels', icon: Users },
  { to: '/palmares', label: 'Palmarès', icon: Award },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
] as const;

export interface SidebarProps {
  hasMeeting: boolean;
}

export function Sidebar({ hasMeeting }: SidebarProps): JSX.Element {
  const navItems = hasMeeting ? [...ALWAYS_VISIBLE, ...MEETING_ITEMS] : ALWAYS_VISIBLE;

  return (
    <nav className="fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col bg-primary-800 text-neutral-0">
      <div className="px-4 py-6">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-neutral-0">
          MDLM Ranking
        </p>
        <p className="text-xs text-primary-200">Meeting de la Mer</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'border-secondary-400 bg-primary-700 text-neutral-0'
                    : 'text-primary-100 hover:bg-primary-700'
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
