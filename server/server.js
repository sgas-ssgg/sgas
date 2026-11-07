/* ================================================================
   SGAS — server.js
   API REST Node.js + Express + PostgreSQL (Supabase)
   ================================================================ */

const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { init }  = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// CORS: solo permite requests desde el frontend en GitHub Pages
const allowedOrigins = [
  'https://sgas-ssgg.github.io',
  'https://adrianramosg84-maker.github.io', // legacy — mantener por compatibilidad
  'http://localhost',
  'http://127.0.0.1',
];
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, curl, mismo servidor)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
    callback(new Error('CORS: origen no permitido'));
  }
}));

// Rate limiting — máximo 200 requests por IP cada 15 minutos
app.use('/api', rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Demasiadas solicitudes. Intentá de nuevo en unos minutos.' },
  skip: (req) => req.path === '/ping', // ping no se limita
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('[:date[iso]] :method :url :status :res[content-length] - :response-time ms'));

// ── Autenticación API Key ──
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error('FATAL: La variable de entorno API_KEY no está configurada. El servidor no puede arrancar sin ella.');
  process.exit(1);
}
app.use('/api', (req, res, next) => {
  // Ruta ping libre (para detección de modo red)
  if (req.path === '/ping') return next();
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
  next();
});

// Ping registrado ANTES de init() — responde inmediatamente aunque la DB esté conectando
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

init().then(() => {
  app.use('/api/ats',         require('./routes/ats'));
  app.use('/api/emergencias', require('./routes/emergencias'));
  app.use('/api/documentos',  require('./routes/documentos'));
  app.use('/api/config',      require('./routes/config'));
  app.use('/api/categorias',  require('./routes/categorias'));
  app.use('/api/sheets',      require('./routes/sheets'));
  app.use('/api/checklists',  require('./routes/checklists'));
  app.use('/api/ot-control',  require('./routes/ot_control'));

  app.listen(PORT, () => {
    console.log(`SGAS Server corriendo en puerto ${PORT}`);
  });
}).catch(err => {
  console.error('Error iniciando DB:', err);
  process.exit(1);
});
