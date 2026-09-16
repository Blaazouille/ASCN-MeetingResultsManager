import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { TeamResult } from './ranking-engine';
import type { PrintMeta } from './print-data';
import { slugifyCategory } from './print-data';
import { downloadBlob } from './download';
import { ASCN_CLUB_NAME, formatPoints } from './utils';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 2, color: '#5B6B7D' },
  date: { fontSize: 10, marginBottom: 16, color: '#5B6B7D' },
  headerRow: { flexDirection: 'row', borderBottom: '1px solid #1A2332', paddingBottom: 4, marginBottom: 4 },
  row: { flexDirection: 'row', borderBottom: '1px solid #D1D7DE', paddingVertical: 6 },
  rowAscn: { backgroundColor: '#F0FAFF' },
  rank: { width: 30, fontWeight: 700 },
  club: { flex: 1, fontWeight: 600 },
  points: { width: 70, textAlign: 'right', fontWeight: 500 },
  headerCell: { fontSize: 9, textTransform: 'uppercase', color: '#5B6B7D' },
  swimmers: { fontSize: 9, color: '#5B6B7D', marginTop: 2 },
  empty: { fontSize: 11, color: '#5B6B7D', marginTop: 16 },
  footer: { marginTop: 24, fontSize: 9, color: '#5B6B7D', flexDirection: 'row', justifyContent: 'space-between' },
});

export interface RankingPdfDocumentProps {
  meta: PrintMeta;
  category: string;
  results: TeamResult[];
}

/** The PDF document tree for one category's team ranking. */
export function RankingPdfDocument({ meta, category, results }: RankingPdfDocumentProps): JSX.Element {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{meta.meetingName}</Text>
        <Text style={styles.subtitle}>Classement par équipes — {category.replace(/^Classement\s+/i, '')}</Text>
        <Text style={styles.date}>{meta.date}</Text>

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
                style={team.club === ASCN_CLUB_NAME ? [styles.row, styles.rowAscn] : styles.row}
              >
                <Text style={styles.rank}>{team.rank}</Text>
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
          <Text>{meta.status.toUpperCase()}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Renders the ranking PDF to an in-memory Blob, without triggering a download. */
export async function buildRankingPdfBlob(
  meta: PrintMeta,
  category: string,
  results: TeamResult[]
): Promise<Blob> {
  return pdf(<RankingPdfDocument meta={meta} category={category} results={results} />).toBlob();
}

/** Builds the ranking PDF and triggers a browser download. */
export async function exportRankingToPdf(
  meta: PrintMeta,
  category: string,
  results: TeamResult[]
): Promise<void> {
  const blob = await buildRankingPdfBlob(meta, category, results);
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `classement-${slugifyCategory(category)}-${today}.pdf`);
}
