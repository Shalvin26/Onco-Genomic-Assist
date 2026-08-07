// test_cloudinary.js
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Point this to any real PDF file on your machine
const pdfPath = './fakegenomic.pdf'; // <-- put a real PDF here, in the backend folder

const buffer = fs.readFileSync(pdfPath);

const stream = cloudinary.uploader.upload_stream(
  { resource_type: 'raw', folder: 'test-uploads', public_id: 'test_pdf_' + Date.now() },
  (error, result) => {
    if (error) {
      console.log('PDF upload failed:', error);
    } else {
      console.log('PDF upload succeeded:', result.secure_url);
    }
  }
);

stream.end(buffer);