import { NavLink } from 'react-router-dom';
import { Home, Printer, Settings, Trophy, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/classement', label: 'Classement', icon: Trophy },
  { to: '/impression', label: 'Impression', icon: Printer },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
] as const;

export function Sidebar(): JSX.Element {
  return (
    <nav className="flex w-[220px] flex-shrink-0 flex-col bg-primary-800 text-neutral-0">
      <div className="px-4 py-6">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-neutral-0">
          AS Cherbourg Natation
        </p>
        <p className="text-xs text-primary-200">Meeting Results</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'border-accent-600 bg-primary-700 text-neutral-0'
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
