/**
 * Responsabilité : routeur principal de l'application (définit les routes et le layout).
 * Appelé par : src/main.tsx.
 * Suppression casserait : toute la navigation entre écrans.
 */
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import HomePage from '@/pages/HomePage';
import ImportPage from '@/pages/ImportPage';
import RankingPage from '@/pages/RankingPage';
import IndividualPage from '@/pages/IndividualPage';
import SettingsPage from '@/pages/SettingsPage';

export default function App(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="classement" element={<RankingPage />} />
          <Route path="individuels" element={<IndividualPage />} />
          <Route path="parametres" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
