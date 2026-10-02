/**
 * Responsabilité : génère et télécharge le PDF du classement par équipes (une page par catégorie).
 * Appelé par : use-ranking-export.ts (bouton "Export PDF" de RankingPage), export-pack-files.ts (« Tout exporter »).
 * Suppression casserait : l'export PDF du classement et le pack de fin de meeting.
 */
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { TeamResult } from './ranking-engine';
import { tiedRanks } from './rank-ties';
import { rankText } from './ui-labels';
import type { ExportMeta, ExportSection } from './export-data';
import { slugifyCategory } from './export-data';
import { downloadBlob } from './download';
import { PdfExportNotice } from './pdf-export-notice';
import { formatPoints } from './utils';
import { isOurClub } from './our-club';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 16, color: '#5B6B7D' },
  headerRow: { flexDirection: 'row', borderBottom: '1px solid #1A2332', paddingBottom: 4, marginBottom: 4 },
  row: { flexDirection: 'row', borderBottom: '1px solid #D1D7DE', paddingVertical: 6 },
  rowOurClub: { backgroundColor: '#F0FAFF' },
  rank: { width: 42, fontWeight: 700 },
  club: { flex: 1, fontWeight: 600 },
  points: { width: 70, textAlign: 'right', fontWeight: 500 },
  headerCell: { fontSize: 9, textTransform: 'uppercase', color: '#5B6B7D' },
  swimmers: { fontSize: 9, color: '#5B6B7D', marginTop: 2 },
  empty: { fontSize: 11, color: '#5B6B7D', marginTop: 16 },
  footer: { marginTop: 24, fontSize: 9, color: '#5B6B7D', flexDirection: 'row', justifyContent: 'space-between' },
});

interface RankingPdfPageProps extends ExportSection<TeamResult> {
  meta: ExportMeta;
}

function RankingPdfPage({ meta, category, results }: RankingPdfPageProps): JSX.Element {
  const tied = tiedRanks(results);
  return (
    <Page size="A4" style={styles.page}>
      <PdfExportNotice meta={meta} />
      <Text style={styles.title}>{meta.meetingName}</Text>
      <Text style={styles.subtitle}>Classement par équipes : {category.replace(/^Classement\s+/i, '')}</Text>

      {results.length === 0 ? (
        <Text style={styles.empty}>Aucun club classé pour cette catégorie.</Text>
      ) : (
        <View>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.rank]}>Rang</Text>
            <Text style={[styles.headerCell, styles.club]}>Club</Text>
            <Text style={[styles.headerCell, styles.points]}>Points</Text>
          </View>
          {results.map((team) => (
            <View
              key={team.club}
              style={isOurClub(team.club, meta.ourClub) ? [styles.row, styles.rowOurClub] : styles.row}
            >
              <Text style={styles.rank}>{rankText(team.rank, tied.has(team.rank))}</Text>
              <View style={styles.club}>
                <Text>{team.club}</Text>
                <Text style={styles.swimmers}>
                  {team.swimmers.map((swimmer) => `${swimmer.lastname} ${swimmer.firstname}`).join(', ')}
                </Text>
              </View>
              <Text style={styles.points}>{formatPoints(team.totalPoints)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text>Calculé le {meta.computedAt}</Text>
      </View>
    </Page>
  );
}

/**
 * One page per section, so the full-meeting pack and the single-category
 * export share the exact same layout (each category starts on a fresh page).
 */
export async function buildRankingPdfBlob(meta: ExportMeta, sections: ExportSection<TeamResult>[]): Promise<Blob> {
  return pdf(
    <Document>
      {sections.map((section) => (
        <RankingPdfPage key={section.category} meta={meta} {...section} />
      ))}
    </Document>
  ).toBlob();
}

/** Builds the ranking PDF and triggers a browser download. */
export async function exportRankingToPdf(
  meta: ExportMeta,
  category: string,
  results: TeamResult[]
): Promise<void> {
  const blob = await buildRankingPdfBlob(meta, [{ category, results }]);
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `classement-${slugifyCategory(category)}-${today}.pdf`);
}
