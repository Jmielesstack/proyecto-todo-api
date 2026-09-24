const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Pool de conexiones a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tododb'
});

// Crear la tabla si no existe
pool.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)
  .then(() => console.log('Conectado a PostgreSQL y tabla lista'))
  .catch(err => console.error(' Error PostgreSQL:', err));

// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'API de Tareas funcionando 🚀' });
});

app.get('/api/tasks', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, completed } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'El título es obligatorio' });
    }
    const { rows } = await pool.query(
      'INSERT INTO tasks (title, description, completed) VALUES ($1, $2, $3) RETURNING *',
      [title, description || null, completed || false]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { title, description, completed } = req.body;
    const { rows } = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           completed = COALESCE($3, completed)
       WHERE id = $4
       RETURNING *`,
      [title, description, completed, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(404).json({ error: 'Tarea no encontrada' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    res.status(404).json({ error: 'Tarea no encontrada' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});