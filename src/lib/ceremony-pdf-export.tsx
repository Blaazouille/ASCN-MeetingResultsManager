/**
 * Responsabilité : génère et télécharge la fiche de proclamation PDF (le déroulé de cérémonie sur papier).
 * Appelé par : use-ceremony-export.ts (bouton « Imprimer le déroulé » de l'écran Cérémonie) et les tests.
 * Suppression casserait : la fiche papier de secours de la remise des prix.
 */
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { CeremonyStep } from './ceremony-script';
import { gapLabel, stepContext, stepCountLabel, stepHeading, winnerLine } from './ceremony-labels';
import type { ExportMeta } from './export-data';
import { downloadBlob } from './download';
import { PdfExportNotice } from './pdf-export-notice';
import { isOurClub } from './our-club';

// Large type on purpose: the sheet is read at arm's length, standing, by the speaker.
const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 13 },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 18, color: '#5B6B7D' },
  step: { flexDirection: 'row', borderBottom: '1px solid #D1D7DE', paddingVertical: 10 },
  checkbox: { width: 18, height: 18, border: '1.5px solid #1A2332', borderRadius: 3, marginRight: 12, marginTop: 2 },
  number: { width: 30, fontSize: 13, fontWeight: 700, color: '#5B6B7D' },
  body: { flex: 1 },
  context: { fontSize: 10, textTransform: 'uppercase', color: '#5B6B7D', marginBottom: 2 },
  heading: { fontSize: 17, fontWeight: 700, marginBottom: 4 },
  winner: { marginBottom: 4 },
  winnerOwnClub: { backgroundColor: '#FFF4EE' },
  name: { fontSize: 16, fontWeight: 700 },
  meta: { fontSize: 12, color: '#3F4F66' },
  swimmers: { fontSize: 11, color: '#5B6B7D', marginTop: 2 },
  gap: { fontSize: 11, color: '#5B6B7D', marginTop: 2 },
  footer: { marginTop: 24, fontSize: 9, color: '#5B6B7D' },
});

interface CeremonyPdfDocumentProps {
  meta: ExportMeta;
  steps: CeremonyStep[];
}

function CeremonyPdfDocument({ meta, steps }: CeremonyPdfDocumentProps): JSX.Element {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfExportNotice meta={meta} />
        <Text style={styles.title}>{meta.meetingName}</Text>
        <Text style={styles.subtitle}>Déroulé de la remise des prix · {stepCountLabel(steps.length)}</Text>
        {steps.map((step, index) => (
          // wrap={false}: an announcement never splits across two pages.
          <View key={step.id} style={styles.step} wrap={false}>
            <View style={styles.checkbox} />
            <Text style={styles.number}>{index + 1}.</Text>
            <View style={styles.body}>
              <Text style={styles.context}>{stepContext(step)}</Text>
              <Text style={styles.heading}>{stepHeading(step)}</Text>
              {step.winners.map((winner) => (
                <View
                  key={`${winner.name}|${winner.club}`}
                  style={isOurClub(winner.club, meta.ourClub) ? [styles.winner, styles.winnerOwnClub] : styles.winner}
                >
                  <Text style={styles.name}>
                    {winner.name}
                    {isOurClub(winner.club, meta.ourClub) ? '  (Notre club)' : ''}
                  </Text>
                  <Text style={styles.meta}>{winnerLine(winner)}</Text>
                  {winner.swimmers.length > 0 && <Text style={styles.swimmers}>{winner.swimmers.join(', ')}</Text>}
                </View>
              ))}
              {step.gapToNext !== null && <Text style={styles.gap}>{gapLabel(step.gapToNext)}</Text>}
            </View>
          </View>
        ))}
        <Text style={styles.footer}>Imprimé le {meta.computedAt}</Text>
      </Page>
    </Document>
  );
}

export async function buildCeremonyPdfBlob(meta: ExportMeta, steps: CeremonyStep[]): Promise<Blob> {
  return pdf(<CeremonyPdfDocument meta={meta} steps={steps} />).toBlob();
}

/** Builds the proclamation sheet and triggers its download. */
export async function exportCeremonyToPdf(meta: ExportMeta, steps: CeremonyStep[]): Promise<void> {
  const blob = await buildCeremonyPdfBlob(meta, steps);
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `deroule-ceremonie-${today}.pdf`);
}
