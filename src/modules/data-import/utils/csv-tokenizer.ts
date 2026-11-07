export interface TokenizeOptions {
  maxRows?: number;
}

export interface TokenizeResult {
  delimiter: string;
  headers: string[];
  rows: string[][];
}

/**
 * Strips UTF-8 Byte-Order Mark (BOM) if present.
 */
export function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Detects the most probable delimiter from the first non-empty line of the text.
 * Checks comma, semicolon, tab.
 */
export function detectDelimiter(text: string): string {
  // Strip BOM if present
  const clean = stripBOM(text);
  const firstLine = clean.split(/\r\n|\r|\n/)[0] || "";

  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  let tabs = 0;

  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (char === ",") commas++;
      else if (char === ";") semicolons++;
      else if (char === "\t") tabs++;
    }
  }

  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas && semicolons > tabs) return ";";
  return ",";
}

/**
 * Parses CSV/TSV text into an array of rows and fields according to RFC 4180.
 * Supports quotes spanning multiple lines, escaped double quotes, and delimiter detection.
 * Throws errors for broken quotes or null bytes.
 */
export function parseDelimitedText(
  text: string,
  options?: TokenizeOptions,
): TokenizeResult {
  // Check for null bytes
  if (text.includes("\0")) {
    throw new Error("File contains invalid null bytes.");
  }

  // Strip BOM
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const delimiter = detectDelimiter(input);

  const maxRows = options?.maxRows;
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  const len = input.length;
  let i = 0;

  while (i < len) {
    const char = input[i];

    if (insideQuotes) {
      if (char === '"') {
        // Look ahead for escaped double quote
        if (i + 1 < len && input[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        if (currentField.length === 0) {
          insideQuotes = true;
          i++;
          continue;
        } else {
          throw new Error("Invalid quote found inside an unquoted field.");
        }
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        currentRow.push(currentField);
        currentField = "";
        if (i + 1 < len && input[i + 1] === "\n") {
          i += 2;
        } else {
          i++;
        }
        // Commit row if not trailing blank row
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
          rows.push(currentRow);
          if (maxRows && rows.length > maxRows + 1) {
            break;
          }
        }
        currentRow = [];
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        i++;
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
          rows.push(currentRow);
          if (maxRows && rows.length > maxRows + 1) {
            break;
          }
        }
        currentRow = [];
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (insideQuotes) {
    throw new Error("File contains an unclosed quote.");
  }

  // Push final field/row if not empty
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    throw new Error("The file is empty.");
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) => h.trim());

  // Verify headers are non-empty
  for (let idx = 0; idx < headers.length; idx++) {
    if (!headers[idx]) {
      throw new Error(`Header column #${idx + 1} is empty. Every column must have a name.`);
    }
  }

  // Verify headers are unique (case-insensitive)
  const headerSet = new Set<string>();
  for (const h of headers) {
    const lower = h.toLowerCase();
    if (headerSet.has(lower)) {
      throw new Error(`Duplicate column name "${h}" found in header. Each column name must be unique.`);
    }
    headerSet.add(lower);
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    throw new Error("The file has headers but contains no data rows.");
  }

  return {
    delimiter,
    headers,
    rows: dataRows,
  };
}

