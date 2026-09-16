import { useCallback, useState } from 'react';
import { parseCsv, type CsvParseResult } from '@/lib/csv-parser';

export interface UseImportResult {
  result: CsvParseResult | null;
  fileName: string | null;
  error: string | null;
  handleFileAccepted: (file: File) => Promise<CsvParseResult | null>;
  handleFileRejected: () => void;
}

/** Owns the CSV import state: parsing the dropped file and surfacing errors. */
export function useImport(): UseImportResult {
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileAccepted = useCallback(async (file: File): Promise<CsvParseResult | null> => {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseCsv(buffer);
      setResult(parsed);
      setFileName(file.name);
      return parsed;
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const handleFileRejected = useCallback((): void => {
    setError('Fichier non supporté (.csv attendu)');
  }, []);

  return { result, fileName, error, handleFileAccepted, handleFileRejected };
}
