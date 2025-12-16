const express = require('express');
const { Pool } = require('pg'); 
const path = require('path');

const app = express();
const port = process.env.PORT || 8080; 

// === 1. CONFIGURACIÓN DE BASE DE DATOS ===
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// === 2. MIDDLEWARES (Configuración necesaria) ===
app.use(express.json()); // Permite leer datos JSON (para crear equipos)
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));



// === 3. RUTAS WEB (Lo que ve el usuario) ===

// A. Página Principal (Dashboard)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// B. Página de Detalle (Ficha QR)
app.get('/detalle', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'detalle.html'));
});

// C. Panel de Admin (Fábrica de QRs)
// Entras poniendo /admin.html o simplemente /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// === 4. API (Cerebro de datos) ===

// API 1: Obtener TODOS los equipos
app.get('/api/equipos', async (req, res) => {
    try {
        

        const result = await pool.query('SELECT * FROM equipos ORDER BY id ASC');
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener equipos');
    }
});

// API 2: Obtener UN SOLO equipo (Por ID)
app.get('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM equipos WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: "Equipo no encontrado" });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al buscar el equipo');
    }
});

// API 3: CREAR UN NUEVO EQUIPO (Guardar en Base de Datos)
// Esta es la parte que usa el Admin Panel
app.post('/api/equipos', async (req, res) => {
    try {
        const { nombre, ubicacion, estado } = req.body;
        
        // Insertamos y pedimos que nos devuelva el ID nuevo (RETURNING id)
        const result = await pool.query(
            'INSERT INTO equipos (nombre, ubicacion, estado) VALUES ($1, $2, $3) RETURNING id',
            [nombre, ubicacion, estado]
        );
        
        // Respondemos con el ID para que el frontend pueda crear el QR
        res.json({ mensaje: 'Equipo creado correctamente', id: result.rows[0].id });
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al guardar equipo');
    }
});

// Prueba de conexión simple
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ estado: 'Conectado', fecha: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === 5. INICIAR SERVIDOR ===
app.listen(port, () => {
    console.log(`Servidor ECEACE listo en el puerto ${port}`);
});