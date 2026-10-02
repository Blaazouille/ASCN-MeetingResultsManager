/**
 * Responsabilité : génère et télécharge le PDF du classement individuel (une page par catégorie).
 * Appelé par : use-individual-export.ts (boutons "Export PDF" de IndividualPage), export-pack-files.ts (« Tout exporter »).
 * Suppression casserait : l'export PDF du classement individuel et le pack de fin de meeting.
 */
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { IndividualResult } from './individual-ranking';
import { tiedRanks } from './rank-ties';
import { categoryShortLabel, rankText } from './ui-labels';
import type { ExportMeta, ExportSection } from './export-data';
import { individualExportFileName } from './export-data';
import { downloadBlob } from './download';
import { PdfExportNotice } from './pdf-export-notice';
import { ASCN_CLUB_NAME, formatPoints } from './utils';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 16, color: '#5B6B7D' },
  headerRow: { flexDirection: 'row', borderBottom: '1px solid #1A2332', paddingBottom: 4, marginBottom: 4 },
  row: { flexDirection: 'row', borderBottom: '1px solid #D1D7DE', paddingVertical: 5 },
  rowAscn: { backgroundColor: '#F0FAFF' },
  rank: { width: 42, fontWeight: 700 },
  name: { flex: 1 },
  year: { width: 46, textAlign: 'right' },
  club: { width: 150 },
  points: { width: 56, textAlign: 'right', fontWeight: 500 },
  headerCell: { fontSize: 8, textTransform: 'uppercase', color: '#5B6B7D' },
  footer: { marginTop: 24, fontSize: 9, color: '#5B6B7D', flexDirection: 'row', justifyContent: 'space-between' },
});

interface IndividualPdfPageProps extends ExportSection<IndividualResult> {
  meta: ExportMeta;
}

function IndividualPdfPage({ meta, category, results }: IndividualPdfPageProps): JSX.Element {
  const tied = tiedRanks(results);

  return (
    <Page size="A4" style={styles.page}>
      <PdfExportNotice meta={meta} />
      <Text style={styles.title}>{meta.meetingName}</Text>
      <Text style={styles.subtitle}>Classement individuel — {categoryShortLabel(category)}</Text>

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
          </View>
          {results.map((r) => (
            <View
              key={`${r.lastname}-${r.firstname}-${r.birthyear}-${r.club}`}
              style={r.club === ASCN_CLUB_NAME ? [styles.row, styles.rowAscn] : styles.row}
            >
              <Text style={styles.rank}>{rankText(r.rank, tied.has(r.rank))}</Text>
              <Text style={styles.name}>{r.lastname} {r.firstname}</Text>
              <Text style={styles.year}>{r.birthyear}</Text>
              <Text style={styles.club}>{r.club}</Text>
              <Text style={styles.points}>{formatPoints(r.points)}</Text>
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
 * Renders the PDF without downloading it, one page per section, so the
 * single-category export and the full-meeting pack share one layout.
 */
export async function buildIndividualPdfBlob(meta: ExportMeta, sections: ExportSection<IndividualResult>[]): Promise<Blob> {
  return pdf(
    <Document>
      {sections.map((section) => (
        <IndividualPdfPage key={section.category} meta={meta} {...section} />
      ))}
    </Document>
  ).toBlob();
}

/** Builds the individual ranking PDF and triggers a browser download. */
export async function exportIndividualToPdf(
  meta: ExportMeta,
  category: string,
  results: IndividualResult[]
): Promise<void> {
  const blob = await buildIndividualPdfBlob(meta, [{ category, results }]);
  downloadBlob(blob, individualExportFileName(category, 'pdf'));
}
