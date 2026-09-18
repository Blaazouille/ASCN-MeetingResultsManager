/**
 * Responsabilité : navigation latérale entre les écrans de l'application.
 * Appelé par : AppShell.tsx.
 * Suppression casserait : la navigation entre écrans.
 */
import { NavLink } from 'react-router-dom';
import { Award, BarChart2, Home, Settings, Upload, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const RANKING_SUB_ITEMS = [
  { to: '/classement', label: 'Par équipes', icon: Users },
  { to: '/individuels', label: 'Individuels', icon: User },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  cn(
    'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors duration-150',
    isActive
      ? 'border-secondary-400 bg-primary-700 text-neutral-0'
      : 'text-primary-100 hover:bg-primary-700'
  );

export interface SidebarProps {
  hasMeeting: boolean;
}

export function Sidebar({ hasMeeting }: SidebarProps): JSX.Element {
  return (
    <nav className="fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col bg-primary-800 text-neutral-0">
      <div className="px-4 py-6">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-neutral-0">
          MDLM Ranking
        </p>
        <p className="text-xs text-primary-200">Meeting de la Mer</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1 px-2">
        <li>
          <NavLink to="/" end className={navLinkClass}>
            <Home className="h-4 w-4" aria-hidden />
            Accueil
          </NavLink>
        </li>

        {hasMeeting && (
          <>
            <li>
              <NavLink to="/import" className={navLinkClass}>
                <Upload className="h-4 w-4" aria-hidden />
                Import
              </NavLink>
            </li>

            <li>
              <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary-300">
                <BarChart2 className="h-4 w-4" aria-hidden />
                Classement
              </div>
              <ul className="flex flex-col gap-1 pl-4">
                {RANKING_SUB_ITEMS.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink to={to} className={navLinkClass}>
                      <Icon className="h-4 w-4" aria-hidden />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>

            <li>
              <NavLink to="/palmares" className={navLinkClass}>
                <Award className="h-4 w-4" aria-hidden />
                Palmarès
              </NavLink>
            </li>

            <li>
              <NavLink to="/parametres" className={navLinkClass}>
                <Settings className="h-4 w-4" aria-hidden />
                Paramètres
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
