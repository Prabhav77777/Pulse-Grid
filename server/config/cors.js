import cors from 'cors';

/** Creates the browser-origin policy for local and deployed clients. */
export function createCorsMiddleware() {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5173', 'https://pulse-grid-zeta.vercel.app'];
  if (process.env.CORS_ORIGINS) allowedOrigins.push(...process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()));
  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  });
}
