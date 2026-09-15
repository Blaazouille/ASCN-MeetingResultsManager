import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';
import { useRanking } from '@/hooks/use-ranking';
import { CategoryTabs } from '@/components/ranking/CategoryTabs';
import { RankingToolbar } from '@/components/ranking/RankingToolbar';
import { TeamRankingTable } from '@/components/ranking/TeamRankingTable';

export default function RankingPage(): JSX.Element {
  const { importState } = useOutletContext<AppOutletContext>();
  const [search, setSearch] = useState('');

  const rows = importState.result?.rows ?? [];
  const categories = importState.result?.categories ?? [];
  const ranking = useRanking(rows, categories);

  if (!importState.result) {
    return <Navigate to="/import" replace />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-800">Classement par équipes</h1>
        <p className="text-neutral-600">{importState.fileName}</p>
      </header>

      <CategoryTabs categories={categories} active={ranking.category} onChange={ranking.setCategory} />
      <RankingToolbar topN={ranking.topN} onTopNChange={ranking.setTopN} />
      <TeamRankingTable
        results={ranking.teamResults}
        topN={ranking.topN}
        search={search}
        onSearchChange={setSearch}
      />
    </div>
  );
}
