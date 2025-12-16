const express = require('express');
const { Pool } = require('pg'); // Importamos la librería para PostgreSQL
const path = require('path');

const app = express();
const port = process.env.PORT || 8080; 

// === CONFIGURACIÓN DE LA BASE DE DATOS (POSTGRESQL) ===
// Aquí le decimos que busque la URL en las variables de entorno de Render.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Middlewares (Configuración básica para entender datos)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// === RUTAS ===

// 1. Ruta Principal: Servirá nuestro tablero (lo crearemos en el sig. paso)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 2. Ruta de Prueba de Base de Datos
// Esta ruta la usaremos para confirmar que PostgreSQL responde.
app.get('/test-db', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        res.json({ estado: 'Conectado', fecha_servidor: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ estado: 'Error de conexión', error: err.message });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor ECEACE listo en el puerto ${port}`);
});