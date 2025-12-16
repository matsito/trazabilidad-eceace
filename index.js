const express = require('express');
const { Pool } = require('pg'); 
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080; 

// === CONFIGURACIÓN DB ===
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});


app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// === RUTAS VISUALES ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/detalle', (req, res) => res.sendFile(path.join(__dirname, 'public', 'detalle.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// === API (CEREBRO) ===

// 1. Obtener lista completa (Dashboard)
app.get('/api/equipos', async (req, res) => {
    try {

       
        const result = await pool.query('SELECT * FROM equipos ORDER BY id ASC');
        

        res.json(result.rows);

   
    } catch (err) { res.status(500).send(err.message); }
});

// 2. Obtener UN equipo y su historial
app.get('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Datos del equipo
        const equipoResult = await pool.query('SELECT * FROM equipos WHERE id = $1', [id]);
        if (equipoResult.rows.length === 0) return res.status(404).json({ mensaje: "No encontrado" });

        // Historial de ese equipo (Ordenado del más nuevo al más viejo)
        const historialResult = await pool.query('SELECT * FROM historial WHERE equipo_id = $1 ORDER BY fecha DESC', [id]);

        res.json({
            equipo: equipoResult.rows[0],
            historial: historialResult.rows
        });
    } catch (err) { res.status(500).send(err.message); }
});

// 3. Crear equipo nuevo
app.post('/api/equipos', async (req, res) => {
    try {
        const { nombre, ubicacion, estado } = req.body;
        // Insertamos equipo
        const result = await pool.query(
            'INSERT INTO equipos (nombre, ubicacion, estado) VALUES ($1, $2, $3) RETURNING id',
            [nombre, ubicacion, estado]
        );
        // Creamos la primera entrada en el historial (Creación)
        const newId = result.rows[0].id;
        await pool.query(
            'INSERT INTO historial (equipo_id, encargado, descripcion, estado_en_ese_momento) VALUES ($1, $2, $3, $4)',
            [newId, 'Sistema', 'Equipo dado de alta en el sistema', estado]
        );
        
        res.json({ mensaje: 'Creado', id: newId });
    } catch (err) { res.status(500).send(err.message); }
});

// 4. NUEVO: AGREGAR REVISIÓN (Actualizar)
app.post('/api/equipos/:id/revision', async (req, res) => {
    try {
        const { id } = req.params;
        const { encargado, descripcion, fecha, nuevo_estado } = req.body;

        const fechaFinal = fecha ? fecha : new Date();

        // 1. Guardar en el Historial
        await pool.query(
            'INSERT INTO historial (equipo_id, encargado, descripcion, fecha, estado_en_ese_momento) VALUES ($1, $2, $3, $4, $5)',
            [id, encargado, descripcion, fechaFinal, nuevo_estado]
        );

        // 2. Actualizar el estado actual del equipo (La "foto" de portada)
        await pool.query(
            'UPDATE equipos SET estado=$1, ultima_revision=$2 WHERE id=$3',
            [nuevo_estado, fechaFinal, id]
        );
        
        res.json({ mensaje: 'Revisión agregada correctamente' });
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(port, () => console.log(`Servidor listo en ${port}`));