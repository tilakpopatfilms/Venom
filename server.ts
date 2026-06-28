/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary: Prefer env variable, otherwise fallback to explicit keys
if (process.env.CLOUDINARY_URL) {
  // Cloudinary automatically picks up CLOUDINARY_URL from process.env
} else {
  cloudinary.config({
    cloud_name: 'duufzu5ai',
    api_key: '688991842387512',
    api_secret: 'dsP-OU3IGonMkVdjUJoz3SVjDjI'
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request body parsing up to 10MB to support base64 image uploads
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Cloudinary image upload endpoint
  app.post('/api/upload', async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(image, {
        folder: 'venoms',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'gif'],
      });

      res.json({ url: result.secure_url });
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload image' });
    }
  });

  // Get IP endpoint to resolve real device public IP behind proxies
  app.get('/api/get-ip', (req, res) => {
    const xForwardedFor = req.headers['x-forwarded-for'];
    let ip = '';
    if (typeof xForwardedFor === 'string') {
      ip = xForwardedFor.split(',')[0].trim();
    } else if (Array.isArray(xForwardedFor)) {
      ip = xForwardedFor[0].trim();
    } else {
      ip = req.socket.remoteAddress || '';
    }
    // Convert IPv6 loopback to readable local IP
    if (ip === '::1' || ip === '::ffff:127.0.0.1') {
      ip = '127.0.0.1';
    }
    res.json({ ip });
  });

  // Handle static assets and SPA fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve production static assets
    app.use(express.static(distPath));
    
    // Redirect all other requests back to index.html to allow client-side router
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
