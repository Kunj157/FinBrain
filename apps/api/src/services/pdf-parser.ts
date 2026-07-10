interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  merchant: string;
  type: 'income' | 'expense';
}

// Match a date at the start of a line: DD.MM.YYYY, MM/DD/YYYY, YYYY-MM-DD
const LINE_DATE_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/;

const DATE_FORMATTERS: { test: RegExp; fmt: (m: RegExpMatchArray) => string }[] = [
  { test: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, fmt: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
  { test: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, fmt: (m) => `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` },
  { test: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, fmt: (m) => `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` },
  { test: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, fmt: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` },
  { test: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, fmt: (m) => `20${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` },
  { test: /^(\d{1,2})\.(\d{1,2})\.(\d{2})$/, fmt: (m) => `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
];

function normalizeDate(raw: string): string {
  for (const { test, fmt } of DATE_FORMATTERS) {
    const m = raw.match(test);
    if (m) return fmt(m);
  }
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return raw;
}

// Parses amounts in German format (comma decimal, optional dot thousands sep)
// and standard format (dot decimal)
// Examples: "400,00" "1.234,56" "-400,00" "400,00-" "992,00" "+6,95" "-50,00"
const AMOUNT_ON_LINE_RE = /^[\s]*([+-])?[\s]*[\d.,]+[\s]*(?:[+-])?[\s]*$/;
const AMOUNT_CAPTURE_RE = /([+-])?[\s]*([\d.,]+)[\s]*([+-])?/;

function parseGermanAmount(text: string): number | null {
  const trimmed = text.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  if (!/^[+-]?[\d.,]+[+-]?$/.test(trimmed)) return null;

  const m = trimmed.match(AMOUNT_CAPTURE_RE);
  if (!m) return null;

  let raw = m[2];
  const leadingSign = m[1] || '';
  const trailingSign = m[3] || '';

  // Detect sign: leading +/-, trailing +/-, or parentheses for negative
  const negative = leadingSign === '-' || trailingSign === '-' ||
    (trimmed.startsWith('(') && trimmed.endsWith(')'));

  // German format: comma is decimal separator, dot is thousands separator
  // Standard format: dot is decimal separator
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');

  if (hasComma) {
    // European/German format: 1.234,56 or 400,00
    raw = raw.replace(/\./g, ''); // remove thousands dots
    raw = raw.replace(',', '.');  // replace decimal comma with dot
  }
  // else standard format: dot is already decimal separator

  const value = parseFloat(raw);
  if (isNaN(value)) return null;
  return negative ? -value : value;
}

const SKIP_LINES: RegExp[] = [
  /^\s*seite\s+\d+/i,
  /^\s*page\s+\d+/i,
  /^\s*kontoauszug/i,
  /^\s*kontostand/i,
  /^\s*sparkasse/i,
  /^\s*vorstand/i,
  /^\s*telefon/i,
  /^\s*telefax/i,
  /^\s*www\.[a-z]/,
  /^\s*swift/i,
  /^\s*bic/i,
  /^\s*blz/i,
  /^\s*ust-id/i,
  /^\s*hr\s+nr/i,
  /^\s*anstalt/i,
  /^\s*universität/i,
  /^\s*ihr\s+ansprechpartner/i,
  /^\s*fax/i,
  /^\s*bahnhofstr/i,
  /^\s*datum/i,
  /^\s*entgeltabschluss/i,
  /^\s*entgelte/i,
  /^\s*kontoführung/i,
  /^\s*bargeldausz/i,
  /^\s*debitk/i,
  /^\s*lastschriften/i,
  /^\s*gutschr/i,
  /^\s*überw/i,
  /^\s*abrechnung/i,
  /^\s*rechnungsnummer/i,
  /^\s*bitte\s+beachten/i,
  /^\s*sehr\s+geehrte/i,
  /^\s*einwendungen/i,
  /^\s*der\s+angegebene/i,
  /^\s*rechnungsabschlüsse/i,
  /^\s*gutschriften/i,
  /^\s*schecks/i,
  /^\s*sparkontoauszüge/i,
  /^\s*dieser\s+kontoauszug/i,
  /^\s*bitte\s+beachten/i,
  /^\s*unsere/i,
  /^\s*mit\s+freundlichen/i,
  /^\s*$/,
  /^\s*-+\s*$/,
  /^\s*_+\s*$/,
  // Bank footer / legal content
  /^\s*[A-Z][a-z]+straße\s+\d+/,
  /^\s*[A-Z][a-z]+\s+\d+[a-z]?,\s+\d{5}\s+[A-Z][a-z]+/,
  /^\s*SWIFT/i,
  /^\s*BIC/i,
  /^\s*BLZ\s*:/i,
  /^\s*USt/i,
  /^\s*HR\s+Nr/i,
  /^\s*Telefon\s+\+/,
  /^\s*Telefax\s+\+/,
  /^\s*[A-Z][a-z]+\s+\([A-Z][a-z]+\)\s*$/,
];

// Lines that indicate a transaction type (German bank statements)
const TXN_TYPE_RE = /^(überw\.|lastschrift|debitk\.|gutschr\.|bargeldausz\.|entgeltabrechnung)/i;

export function parsePdfText(text: string): ParsedTransaction[] {
  // Split into lines, preserving trailing spaces for right-aligned amounts
  const rawLines = text.split('\n');
  const lines = rawLines.map(l => l.trimEnd()); // keep leading spaces for amount detection

  const transactions: ParsedTransaction[] = [];

  // Step 1: Group lines into transaction blocks
  // A block starts with a line containing a date (DD.MM.YYYY) followed by a transaction type
  // A block ends when the next date-prefixed line is found (or end of data)

  interface Block {
    dateStr: string;
    lines: string[];
  }

  const blocks: Block[] = [];
  let currentBlock: Block | null = null;

  for (const line of lines) {
    if (SKIP_LINES.some(r => r.test(line))) continue;

    const dateMatch = line.match(LINE_DATE_RE);

    // This line starts a new transaction if:
    // - It starts with a date
    // - AND the date is followed by text (not just the date alone)
    // - AND either there's no current block, or it looks like a real transaction (not a balance line)
    if (dateMatch) {
      const dateStr = dateMatch[0];
      const afterDate = line.slice(dateMatch.index! + dateMatch[0].length);

      // Skip balance lines like "Kontostand am 30.04.2026"
      if (/^\s*[,:]/.test(afterDate) || /kontostand/i.test(line) || /^\s*(am|um)/i.test(afterDate)) {
        continue;
      }

      // Check if this looks like a balance/statement line rather than a transaction
      if (/auszug/i.test(line) || /seite/i.test(line) || /anlage/i.test(line)) {
        continue;
      }

      // Finalize previous block
      if (currentBlock) {
        blocks.push(currentBlock);
      }

      currentBlock = {
        dateStr,
        lines: [afterDate],
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  // Clean up blocks: trim lines after the last amount line (catches footer contamination)
  for (const block of blocks) {
    let lastAmountIdx = -1;
    for (let i = block.lines.length - 1; i >= 0; i--) {
      const trimmed = block.lines[i].trim();
      if (/^[+-]?[\d.,]+[+-]?$/.test(trimmed) && parseGermanAmount(trimmed) !== null) {
        // This line is an amount (possibly with leading whitespace)
        lastAmountIdx = i;
        break;
      }
    }
    if (lastAmountIdx >= 0) {
      block.lines = block.lines.slice(0, lastAmountIdx + 1);
    }
  }

  // Step 2: Process each block to extract amount and description
  for (const block of blocks) {
    const amount = extractAmountFromBlock(block.lines);
    if (amount === null || amount === 0) continue;

    // Clean up description: remove the amount line and known non-description lines
    const descLines = block.lines.filter(l => {
      // Skip lines that are purely whitespace + amount
      if (AMOUNT_ON_LINE_RE.test(l) && parseGermanAmount(l) !== null) return false;
      // Skip lines that look like transaction metadata
      if (/^\s*(17:|18:|19:|20:|21:|22:|23:|00:|01:|02:|03:|04:|05:|06:|07:|08:|09:|10:|11:|12:|13:|14:|15:|16:)/i.test(l)) return false;
      if (/^\s*DATUM\s/i.test(l)) return false;
      if (/^[\s]*Teillieferung/i.test(l)) return false;
      if (/^[\s]*Zahl\.System/i.test(l)) return false;
      if (SKIP_LINES.some(r => r.test(l))) return false;
      return true;
    });

    const fullDesc = descLines.map(l => l.trim()).filter(Boolean).join(' ').trim();
    if (!fullDesc) continue;

    // Extract merchant: first meaningful word(s) before any special characters
    const merchant = fullDesc.split(/\/\/|\d{15,}|[0-9]{4}-[0-9]{2}-[0-9]{2}T/)[0].replace(/\s+/g, ' ').trim() || fullDesc;

    transactions.push({
      date: normalizeDate(block.dateStr),
      amount: Math.abs(amount),
      description: fullDesc,
      merchant: merchant.length > 100 ? fullDesc.substring(0, 100) : merchant,
      type: amount < 0 ? 'expense' : 'income',
    });
  }

  return transactions;
}

function extractAmountFromBlock(lines: string[]): number | null {
  // Amount is typically on the last non-empty line of a block
  // Look for lines that match the amount pattern (right-aligned with leading spaces)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    // Check if this line contains an amount pattern (with leading spaces)
    const amount = parseGermanAmount(line);
    if (amount !== null && amount !== 0) return amount;
    // Don't go past certain lines
    if (/wert:/i.test(line) && parseGermanAmount(line) === null) continue;
  }
  return null;
}