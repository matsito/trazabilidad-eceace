const express = require('express');
const { Pool } = require('pg'); 
const path = require('path');

const app = express();
const port = process.env.PORT || 8080; 

// === CONFIGURACIÓN DE LA BASE DE DATOS (POSTGRESQL) ===
// Conectamos con la URL que nos da Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Middlewares (Configuración básica)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Servir archivos de la carpeta 'public' (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// === RUTAS ===

// 1. Ruta Principal: Muestra la página web (el Dashboard)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 2. Ruta de Prueba: Verifica conexión a la BD
app.get('/test-db', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        res.json({ estado: 'Conectado', fecha_servidor: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 3. RUTA NUEVA: API DE EQUIPOS
// Esta ruta va a la Base de Datos, busca la tabla 'equipos' y devuelve los datos en JSON.
app.get('/api/equipos', async (req, res) => {
    try {
        // Consultamos a la base de datos
        const result = await pool.query('SELECT * FROM equipos ORDER BY id ASC');
        // Enviamos la lista de equipos al navegador
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener equipos de la base de datos');
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor ECEACE listo en el puerto ${port}`);
});