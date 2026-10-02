import { describe, expect, it } from 'vitest';
import { appendBoundedLog, formatUpdateLogLine, MAX_UPDATE_LOG_LINES } from '../src/lib/update-log';

const at = '2026-10-02T10:30:00.000Z';

describe('formatUpdateLogLine', () => {
  it('writes the date, the outcome and the full error detail on one line', () => {
    const line = formatUpdateLogLine(
      { checkedAt: at, outcome: 'failed', message: 'HttpError: 404' },
      'HttpError: 404\n    at fetch (provider.js:12)'
    );
    expect(line).toBe(`${at} failed HttpError: 404 at fetch (provider.js:12)`);
  });

  it('writes only the date and the outcome for a successful check', () => {
    expect(formatUpdateLogLine({ checkedAt: at, outcome: 'up-to-date', message: null }, null)).toBe(`${at} up-to-date`);
  });

  it('caps a huge error (e.g. a whole HTTP response) so the log stays small', () => {
    const line = formatUpdateLogLine({ checkedAt: at, outcome: 'failed', message: 'x' }, 'x'.repeat(10_000));
    expect(line.length).toBeLessThanOrEqual(500);
  });
});

describe('appendBoundedLog', () => {
  it('appends a line to an empty log', () => {
    expect(appendBoundedLog('', 'a')).toBe('a\n');
  });

  it('appends after the existing lines', () => {
    expect(appendBoundedLog('a\nb\n', 'c')).toBe('a\nb\nc\n');
  });

  it('drops the oldest lines beyond the limit, keeping the newest', () => {
    expect(appendBoundedLog('1\n2\n3\n', '4', 3)).toBe('2\n3\n4\n');
  });

  it('keeps at most MAX_UPDATE_LOG_LINES lines by default', () => {
    const full = Array.from({ length: MAX_UPDATE_LOG_LINES }, (_, i) => `line ${i}`).join('\n');
    const lines = appendBoundedLog(full, 'newest').trimEnd().split('\n');
    expect(lines).toHaveLength(MAX_UPDATE_LOG_LINES);
    expect(lines[0]).toBe('line 1');
    expect(lines.at(-1)).toBe('newest');
  });

  it('reads a log edited on Windows (CRLF) without blank lines', () => {
    expect(appendBoundedLog('a\r\nb\r\n', 'c')).toBe('a\nb\nc\n');
  });
});
