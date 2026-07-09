import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });
const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

router.post('/ocr', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const formData = new FormData();
    const blob = new Blob([fs.readFileSync(file.path)], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    const response = await fetch(`${ML_SERVICE_URL}/api/v1/receipts/ocr`, {
      method: 'POST',
      body: formData,
    });

    fs.unlinkSync(file.path);

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ success: false, error: error.detail || 'OCR failed' });
    }

    const result = await response.json();
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Receipt OCR error:', error);
    res.status(500).json({ success: false, error: 'OCR service unavailable. Make sure the ML service is running.' });
  }
});

export default router;