import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  let text;
  if (ext === '.pdf') {
    const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (ext === '.docx') {
    text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
  } else if (ext === '.txt' || ext === '.md') {
    text = file.buffer.toString('utf8');
  } else {
    throw new Error('Unsupported resume format. Use PDF, DOCX or TXT.');
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}
