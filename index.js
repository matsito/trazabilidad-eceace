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

// === 2. CONFIGURACIÓN DEL SERVIDOR ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// === 3. RUTAS DE PÁGINAS WEB (LO QUE VE EL USUARIO) ===

// A. Página Principal (Dashboard General)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// B. Página de Detalle (Esta es la que abrirá el QR)
// Ejemplo de uso: https://tu-web.com/detalle?id=1
app.get('/detalle', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'detalle.html'));
});

// === 4. RUTAS API (DATOS PARA EL CÓDIGO) ===

// Prueba de conexión
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ estado: 'Conectado', fecha: result.rows[0].now });
    
    } catch (err) {
        
        res.status(500).json({ error: err.message });
    }
});

// API 1: Obtener TODOS los equipos (Para el Dashboard)
app.get('/api/equipos', async (req, res) => {
    try {

        
        const result = await pool.query('SELECT * FROM equipos ORDER BY id ASC');
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener equipos');
    }
});

// API 2: Obtener UN SOLO equipo (Para el QR)
// El servidor busca por el ID que le enviemos en la URL
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

// === 5. INICIAR SERVIDOR ===
app.listen(port, () => {
    console.log(`Servidor ECEACE listo en el puerto ${port}`);
});