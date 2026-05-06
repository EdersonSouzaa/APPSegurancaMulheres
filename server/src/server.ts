import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import ocorrenciaRoutes from './routes/ocorrencias.js';
import contatoRoutes from './routes/contatos.js';
import sosRoutes from './routes/sos.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/ocorrencias', ocorrenciaRoutes);
app.use('/contatos', contatoRoutes);
app.use('/sos', sosRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('ElaSegura API is running');
});

const startServer = async () => {
  try {
    // We try to init DB, but if it fails (e.g. DB not ready yet), 
    // we might want to retry or just log.
    // For simplicity in this script, we'll just try once.
    await initDb();
    
    app.listen(Number(port), '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Even if DB fails, we start the server so the process doesn't just die 
    // and can be debugged via health check if needed, 
    // but usually it's better to exit or retry.
    app.listen(Number(port), '0.0.0.0', () => {
      console.log(`Server started with errors on http://0.0.0.0:${port}`);
    });
  }
};

startServer();
