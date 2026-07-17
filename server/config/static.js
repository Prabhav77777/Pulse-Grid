import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const distributionDirectory = path.join(directory, '../../dist');

/** Serves the built SPA and history fallback in production only. */
export function configureStaticAssets(app) {
  if (process.env.NODE_ENV !== 'production') return;
  app.use(express.static(distributionDirectory));
  app.get('*', (req, res, next) => (req.path.startsWith('/api') ? next() : res.sendFile(path.join(distributionDirectory, 'index.html'))));
}
