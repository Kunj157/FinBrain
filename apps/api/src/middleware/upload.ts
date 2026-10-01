import fs from 'fs';
import multer from 'multer';

/**
 * Shared upload handling for statement and receipt ingestion.
 *
 * Both routes previously used a bare `multer({ dest: 'uploads/' })`: no size
 * limit and no type filter, so an authenticated request could write a file of
 * any size to disk and then have it read fully into memory.
 *
 * Path traversal is not a concern here — multer generates its own random
 * filename and ignores the client's `originalname`.
 */

/** Generous enough for a multi-year statement, far below what exhausts memory. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const STATEMENT_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel', // what several browsers send for .csv
  'application/pdf',
]);

// Clients frequently send this for a perfectly ordinary .csv or .pdf, so it
// cannot be rejected outright — but on its own it says nothing, so it only
// passes when the extension corroborates it. Accepting it as a type in its own
// right let any file through, which is what happened when I first wrote this.
const UNINFORMATIVE_MIME_TYPES = new Set(['application/octet-stream', '']);

const RECEIPT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

const STATEMENT_EXTENSIONS = /\.(csv|pdf|txt)$/i;
const RECEIPT_EXTENSIONS = /\.(jpe?g|png|webp|heic|pdf)$/i;

function fileFilter(allowedMimeTypes: Set<string>, allowedExtensions: RegExp) {
  return (
    _req: Express.Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback,
  ) => {
    // Browsers are inconsistent about the MIME type they attach, so a
    // recognised extension counts as corroboration. Neither check is a
    // security boundary — both parsers still have to cope with whatever
    // arrives — but together they stop obvious nonsense reaching disk.
    const extensionAllowed = allowedExtensions.test(file.originalname || '');
    const mimeIsInformative = !UNINFORMATIVE_MIME_TYPES.has(file.mimetype);
    const mimeAllowed = mimeIsInformative && allowedMimeTypes.has(file.mimetype);

    if (mimeAllowed || extensionAllowed) {
      callback(null, true);
      return;
    }

    callback(new Error('UNSUPPORTED_FILE_TYPE'));
  };
}

export const uploadStatement = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: fileFilter(STATEMENT_MIME_TYPES, STATEMENT_EXTENSIONS),
});

export const uploadReceipt = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: fileFilter(RECEIPT_MIME_TYPES, RECEIPT_EXTENSIONS),
});

/**
 * Delete an uploaded temp file, ignoring the case where it is already gone.
 *
 * Cleanup used to sit only on the success path, so every parser failure
 * stranded a file in `uploads/` permanently. Call this from a `finally`.
 */
export function discardUpload(file: Express.Multer.File | undefined): void {
  if (!file?.path) return;
  try {
    fs.unlinkSync(file.path);
  } catch (error) {
    // A missing file is the expected case when cleanup has already run;
    // anything else is worth knowing about but must not mask the response.
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.error('Failed to remove upload temp file:', error);
    }
  }
}

export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);
