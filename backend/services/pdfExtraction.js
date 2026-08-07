const pdfParse = require('pdf-parse');
const AppError = require('../utils/AppError');


const extractTextFromPdf = async (fileBuffer) => {
  try {
    const data = await pdfParse(fileBuffer);

    if (!data.text || data.text.trim().length === 0) {
      throw new AppError(
        'No extractable text found in this PDF. It may be a scanned image without OCR.',
        422
      );
    }

    return data.text;
  } catch (error) {
    
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to extract text from PDF. The file may be corrupted.', 422);
  }
};

module.exports = { extractTextFromPdf };