/**
 * Responsabilité : génère et télécharge le PDF du classement individuel.
 * Appelé par : use-individual-export.ts (boutons "Export PDF" de IndividualPage).
 * Suppression casserait : l'export PDF du classement individuel.
 */
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { IndividualResult } from './individual-ranking';
import type { PrintMeta } from './export-data';
import { downloadBlob } from './download';
import { ASCN_CLUB_NAME, formatPoints } from './utils';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 16, color: '#5B6B7D' },
  headerRow: { flexDirection: 'row', borderBottom: '1px solid #1A2332', paddingBottom: 4, marginBottom: 4 },
  row: { flexDirection: 'row', borderBottom: '1px solid #D1D7DE', paddingVertical: 5 },
  rowAscn: { backgroundColor: '#F0FAFF' },
  rank: { width: 28, fontWeight: 700 },
  name: { flex: 1 },
  year: { width: 46, textAlign: 'right' },
  club: { width: 150 },
  points: { width: 56, textAlign: 'right', fontWeight: 500 },
  category: { width: 64, textAlign: 'right', color: '#5B6B7D' },
  headerCell: { fontSize: 8, textTransform: 'uppercase', color: '#5B6B7D' },
  footer: { marginTop: 24, fontSize: 9, color: '#5B6B7D', flexDirection: 'row', justifyContent: 'space-between' },
});

interface IndividualPdfDocumentProps {
  meta: PrintMeta;
  category: string;
  results: IndividualResult[];
}

function IndividualPdfDocument({ meta, category, results }: IndividualPdfDocumentProps): JSX.Element {
  const showCategory = category === 'Tous';
  const subtitle = category === 'Tous' ? 'Toutes catégories' : category.replace(/^Classement\s+/i, '');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{meta.meetingName}</Text>
        <Text style={styles.subtitle}>Classement individuel — {subtitle}</Text>

        {results.length === 0 ? (
          <Text style={{ fontSize: 11, color: '#5B6B7D', marginTop: 16 }}>Aucun résultat.</Text>
        ) : (
          <View>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.rank]}>Rang</Text>
              <Text style={[styles.headerCell, styles.name]}>Nom</Text>
              <Text style={[styles.headerCell, styles.year]}>Née</Text>
              <Text style={[styles.headerCell, styles.club]}>Club</Text>
              <Text style={[styles.headerCell, styles.points]}>Points</Text>
              {showCategory && <Text style={[styles.headerCell, styles.category]}>Catégorie</Text>}
            </View>
            {results.map((r) => (
              <View
                key={`${r.lastname}-${r.firstname}-${r.birthyear}-${r.club}`}
                style={r.club === ASCN_CLUB_NAME ? [styles.row, styles.rowAscn] : styles.row}
              >
                <Text style={styles.rank}>{r.rank}</Text>
                <Text style={styles.name}>{r.lastname} {r.firstname}</Text>
                <Text style={styles.year}>{r.birthyear}</Text>
                <Text style={styles.club}>{r.club}</Text>
                <Text style={styles.points}>{formatPoints(r.points)}</Text>
                {showCategory && (
                  <Text style={styles.category}>{r.category.replace(/^Classement\s+/i, '')}</Text>
                )}
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

export async function exportIndividualToPdf(
  meta: PrintMeta,
  category: string,
  results: IndividualResult[]
): Promise<void> {
  const blob = await pdf(<IndividualPdfDocument meta={meta} category={category} results={results} />).toBlob();
  const today = new Date().toISOString().slice(0, 10);
  const slug = category.replace(/^Classement\s+/i, '').toLowerCase().replace(/\s+/g, '-') || 'tous';
  downloadBlob(blob, `classement-individuel-${slug}-${today}.pdf`);
}
