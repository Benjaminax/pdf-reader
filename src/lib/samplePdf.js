import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Creates a sample PDF book document for testing and demo purposes.
 * Returns a File object that can be added to the library and opened in Reader.
 */
export async function createSampleBook() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Cover Page
  const cover = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = cover.getSize();

  // Draw background color for cover
  cover.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.1, 0.45, 0.28),
  });

  // Cover border
  cover.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: rgb(0.95, 0.88, 0.72),
    borderWidth: 2,
  });

  // Cover Title
  cover.drawText('THE ART OF READING', {
    x: 60,
    y: height - 200,
    size: 32,
    font: helveticaBoldFont,
    color: rgb(0.98, 0.98, 0.95),
  });

  cover.drawText('A Digital Companion for Book Lovers', {
    x: 60,
    y: height - 240,
    size: 16,
    font: timesItalicFont,
    color: rgb(0.95, 0.88, 0.72),
  });

  // Decorative rule
  cover.drawLine({
    start: { x: 60, y: height - 270 },
    end: { x: width - 60, y: height - 270 },
    thickness: 1.5,
    color: rgb(0.95, 0.88, 0.72),
  });

  cover.drawText('PAGE.VERSE CLASSICS EDITION', {
    x: 60,
    y: 90,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0.95, 0.88, 0.72),
  });

  // Page 2 - Preface
  const p2 = pdfDoc.addPage([595.28, 841.89]);
  p2.drawText('CHAPTER I', {
    x: 60,
    y: height - 100,
    size: 20,
    font: helveticaBoldFont,
    color: rgb(0.1, 0.2, 0.15),
  });

  p2.drawText('The Quiet Pleasure of the Page', {
    x: 60,
    y: height - 130,
    size: 14,
    font: timesItalicFont,
    color: rgb(0.4, 0.45, 0.42),
  });

  const text1 = [
    'Reading is a sanctuary of the mind. In a world full of noise and fleeting',
    'distractions, opening a book allows us to slow down, reflect, and travel',
    'across space and time. A great book does not merely inform; it transforms',
    'our perspective and sparks our imagination.',
    '',
    'With horizontal page flips and realistic layouts, reading on digital screens',
    'can feel natural, tactile, and deeply focused. Welcome to your personal space',
    'for literature, knowledge, and discovery.',
  ];

  let yOffset = height - 180;
  for (const line of text1) {
    if (line) {
      p2.drawText(line, {
        x: 60,
        y: yOffset,
        size: 12,
        font: timesRomanFont,
        color: rgb(0.18, 0.22, 0.2),
      });
    }
    yOffset -= 22;
  }

  // Page 3 - Chapter II
  const p3 = pdfDoc.addPage([595.28, 841.89]);
  p3.drawText('CHAPTER II', {
    x: 60,
    y: height - 100,
    size: 20,
    font: helveticaBoldFont,
    color: rgb(0.1, 0.2, 0.15),
  });

  p3.drawText('Notes, Thoughts, and Memory', {
    x: 60,
    y: height - 130,
    size: 14,
    font: timesItalicFont,
    color: rgb(0.4, 0.45, 0.42),
  });

  const text2 = [
    'As you read through these pages, you can add notes and bookmarks to keep track',
    'of key insights. Annotations remain saved right on your device so you can',
    'return to them whenever inspiration strikes.',
    '',
    'Try using the Note tool to add thoughts to a page, or place a Bookmark',
    'to mark your favorite passages.',
  ];

  yOffset = height - 180;
  for (const line of text2) {
    if (line) {
      p3.drawText(line, {
        x: 60,
        y: yOffset,
        size: 12,
        font: timesRomanFont,
        color: rgb(0.18, 0.22, 0.2),
      });
    }
    yOffset -= 22;
  }

  // Page 4 - Back Cover / Notes
  const p4 = pdfDoc.addPage([595.28, 841.89]);
  p4.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.96, 0.95, 0.92),
  });

  p4.drawText('HAPPY READING!', {
    x: width / 2 - 80,
    y: height / 2 + 20,
    size: 22,
    font: helveticaBoldFont,
    color: rgb(0.1, 0.35, 0.22),
  });

  p4.drawText('PAGE.verse Sample Edition', {
    x: width / 2 - 70,
    y: height / 2 - 15,
    size: 12,
    font: timesItalicFont,
    color: rgb(0.4, 0.45, 0.42),
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return new File([blob], 'The Art of Reading.pdf', {
    type: 'application/pdf',
    lastModified: Date.now(),
  });
}

/**
 * Creates a sample comic/graphic novel PDF document for testing.
 */
export async function createSampleComic() {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  // Cover Page
  const cover = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = cover.getSize();

  cover.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(0.08, 0.15, 0.32), // Deep comic navy
  });

  cover.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: rgb(0.98, 0.75, 0.1), // Bright comic gold
    borderWidth: 3,
  });

  cover.drawText('CHRONICLES OF THE VERSE', {
    x: 45,
    y: height - 160,
    size: 26,
    font: helveticaBold,
    color: rgb(0.98, 0.98, 0.95),
  });

  cover.drawText('Issue #1 · Digital Graphic Novel', {
    x: 45,
    y: height - 200,
    size: 16,
    font: timesItalic,
    color: rgb(0.98, 0.75, 0.1),
  });

  // Comic Page 2
  const p2 = pdfDoc.addPage([595.28, 841.89]);
  p2.drawRectangle({
    x: 35,
    y: height - 360,
    width: width - 70,
    height: 300,
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 2,
    color: rgb(0.95, 0.97, 1.0),
  });
  p2.drawText('PANEL 1: THE DISCOVERY', {
    x: 55,
    y: height - 100,
    size: 18,
    font: helveticaBold,
    color: rgb(0.1, 0.25, 0.55),
  });
  p2.drawText('"In the silent library, a forgotten graphic novel was uncovered..."', {
    x: 55,
    y: height - 140,
    size: 12,
    font: timesItalic,
    color: rgb(0.2, 0.2, 0.2),
  });

  p2.drawRectangle({
    x: 35,
    y: 80,
    width: width - 70,
    height: 300,
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 2,
    color: rgb(1.0, 0.96, 0.92),
  });
  p2.drawText('PANEL 2: THE ADVENTURE CONTINUES', {
    x: 55,
    y: 340,
    size: 18,
    font: helveticaBold,
    color: rgb(0.85, 0.25, 0.1),
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return new File([blob], 'Chronicles of the Verse (Comic #1).pdf', {
    type: 'application/pdf',
    lastModified: Date.now(),
  });
}
