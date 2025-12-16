const express = require('express');
const { Pool } = require('pg'); 
const path = require('path');
const cors = require('cors'); // Agregamos cors por seguridad básica

const app = express();
const port = process.env.PORT || 8080; 

// === 1. CONFIGURACIÓN ===
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});


app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// === 2. RUTAS WEB ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/detalle', (req, res) => res.sendFile(path.join(__dirname, 'public', 'detalle.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// === 3. API (CEREBRO) ===

// A. Obtener TODOS (Para Dashboard)
app.get('/api/equipos', async (req, res) => {
    try {

       
        
        const result = await pool.query('SELECT * FROM equipos ORDER BY id ASC');
        
        
        res.json(result.rows);



    } catch (err) { res.status(500).send(err.message); }
});

// B. Obtener UNO (Para Ficha QR y para Editar)
app.get('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM equipos WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ mensaje: "No encontrado" });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).send(err.message); }
});

// C. CREAR NUEVO (Con fecha manual opcional)
app.post('/api/equipos', async (req, res) => {
    try {
        const { nombre, ubicacion, estado, ultima_revision } = req.body;
        
        // Si no mandan fecha, usamos la actual. Si mandan, usamos esa.
        const fechaFinal = ultima_revision ? ultima_revision : new Date();

        const result = await pool.query(
            'INSERT INTO equipos (nombre, ubicacion, estado, ultima_revision) VALUES ($1, $2, $3, $4) RETURNING id',
            [nombre, ubicacion, estado, fechaFinal]
        );
        res.json({ mensaje: 'Creado', id: result.rows[0].id });
    } catch (err) { res.status(500).send(err.message); }
});

// D. ACTUALIZAR EQUIPO (¡NUEVO!)
// Permite cambiar estado y fecha sin cambiar el ID (el QR sigue sirviendo)
app.put('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, ultima_revision, nombre, ubicacion } = req.body; // Recibimos todo por si acaso

        const fechaFinal = ultima_revision ? ultima_revision : new Date();

        // Actualizamos en la base de datos
        await pool.query(
            'UPDATE equipos SET nombre=$1, ubicacion=$2, estado=$3, ultima_revision=$4 WHERE id=$5',
            [nombre, ubicacion, estado, fechaFinal, id]
        );
        
        res.json({ mensaje: 'Actualizado correctamente' });
    } catch (err) { res.status(500).send(err.message); }
});

// === INICIO ===
app.listen(port, () => console.log(`Servidor listo puerto ${port}`));