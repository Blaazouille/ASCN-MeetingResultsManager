/**
 * Responsabilité : ligne d'avertissement (« EXEMPLE — non officiel ») en tête des PDF du meeting d'entraînement.
 * Appelé par : pdf-export.tsx, individual-pdf-export.tsx, ceremony-pdf-export.tsx.
 * Suppression casserait : la mention qui empêche un PDF d'exemple de passer pour des résultats officiels.
 */
import { StyleSheet, Text } from '@react-pdf/renderer';
import { EXPORT_NOTICE_COLOR, type ExportMeta } from './export-data';

const styles = StyleSheet.create({
  notice: { fontSize: 12, fontWeight: 700, color: EXPORT_NOTICE_COLOR, marginBottom: 8 },
});

export interface PdfExportNoticeProps {
  meta: ExportMeta;
}

/** Renders nothing for a real meeting (`meta.notice` is null). */
export function PdfExportNotice({ meta }: PdfExportNoticeProps): JSX.Element | null {
  return meta.notice ? <Text style={styles.notice}>{meta.notice}</Text> : null;
}
