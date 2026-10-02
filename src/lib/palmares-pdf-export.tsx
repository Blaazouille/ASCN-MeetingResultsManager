/**
 * Responsabilité : génère le PDF du palmarès des rigolos (une page par catégorie).
 * Appelé par : export-pack-files.ts (« Tout exporter » de RankingPage).
 * Suppression casserait : le fichier « Palmarès.pdf » du pack de fin de meeting.
 */
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { FunAward } from './fun-awards';
import type { ExportMeta, ExportSection } from './export-data';
import { categoryShortLabel } from './ui-labels';
import { PdfExportNotice } from './pdf-export-notice';

// Same palette and spacing as the ranking PDFs so the pack reads as one set of documents.
const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 16, color: '#5B6B7D' },
  award: { borderBottom: '1px solid #D1D7DE', paddingVertical: 8 },
  awardTitle: { fontSize: 14, fontWeight: 700, color: '#1A2332' },
  winner: { fontSize: 12, fontWeight: 600, marginTop: 2 },
  detail: { fontSize: 10, color: '#5B6B7D', marginTop: 2 },
  empty: { fontSize: 11, color: '#5B6B7D', marginTop: 16 },
  footer: { marginTop: 24, fontSize: 9, color: '#5B6B7D' },
});

interface PalmaresPdfPageProps extends ExportSection<FunAward> {
  meta: ExportMeta;
}

function PalmaresPdfPage({ meta, category, results }: PalmaresPdfPageProps): JSX.Element {
  return (
    <Page size="A4" style={styles.page}>
      <PdfExportNotice meta={meta} />
      <Text style={styles.title}>{meta.meetingName}</Text>
      <Text style={styles.subtitle}>Palmarès des rigolos — {categoryShortLabel(category)}</Text>

      {results.length === 0 ? (
        <Text style={styles.empty}>Aucun prix disponible pour cette catégorie.</Text>
      ) : (
        results.map((award) => (
          <View key={award.id} style={styles.award}>
            <Text style={styles.awardTitle}>{award.title}</Text>
            <Text style={styles.winner}>{award.winner.name}</Text>
            {/* Club prizes use the club as the winner's name: don't print it twice (same rule as FunAwardsGrid). */}
            {award.winner.club !== award.winner.name && <Text style={styles.detail}>{award.winner.club}</Text>}
            <Text style={styles.detail}>{award.winner.detail}</Text>
          </View>
        ))
      )}

      <View style={styles.footer}>
        <Text>Calculé le {meta.computedAt}</Text>
      </View>
    </Page>
  );
}

/** One page per category, like the ranking PDFs. */
export async function buildPalmaresPdfBlob(meta: ExportMeta, sections: ExportSection<FunAward>[]): Promise<Blob> {
  return pdf(
    <Document>
      {sections.map((section) => (
        <PalmaresPdfPage key={section.category} meta={meta} {...section} />
      ))}
    </Document>
  ).toBlob();
}
