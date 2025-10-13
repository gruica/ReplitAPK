import { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export function setupStaticFileServer(app: Express) {
  // Jednostavan endpoint za serviranje slika iz uploads foldera
  app.get('/uploads/:fileName', (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    
    // Development only logging
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📷 Serving image: ${fileName}`);
    }
    
    if (!fs.existsSync(filePath)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📷 File not found: ${filePath}`);
      }
      return res.status(404).send('Image not found');
    }
    
    try {
      // Određi content type na osnovu ekstenzije
      const ext = path.extname(fileName).toLowerCase();
      let contentType = 'image/jpeg'; // default
      
      if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📷 ✅ Image served successfully: ${fileName}`);
      }
      
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`📷 ❌ Error serving image:`, error);
      }
      res.status(500).send('Error serving image');
    }
  });
}