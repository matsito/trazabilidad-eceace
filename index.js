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

// AUMENTAMOS EL LÍMITE A 50MB PARA PODER SUBIR PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// === RUTAS VISUALES ===
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/detalle', (req, res) => res.sendFile(path.join(__dirname, 'public', 'detalle.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// === API (CEREBRO) ===

// 1. Dashboard (Lista simple)
app.get('/api/equipos', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre, ubicacion, estado, ultima_revision FROM equipos ORDER BY id ASC');
        res.json(result.rows);
    
    } catch (err) { res.status(500).send(err.message); }
});

// 2. Detalle único (Con PDF e Historial)
app.get('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const equipoResult = await pool.query('SELECT * FROM equipos WHERE id = $1', [id]);
        if (equipoResult.rows.length === 0) return res.status(404).json({ mensaje: "No encontrado" });

        const historialResult = await pool.query('SELECT * FROM historial WHERE equipo_id = $1 ORDER BY fecha DESC', [id]);

        res.json({ equipo: equipoResult.rows[0], historial: historialResult.rows });
    } catch (err) { res.status(500).send(err.message); }
});

// 3. Crear equipo (Con PDF opcional)
app.post('/api/equipos', async (req, res) => {
    try {
        const { nombre, ubicacion, estado, pdf_data, pdf_nombre } = req.body;
        
        const result = await pool.query(
            'INSERT INTO equipos (nombre, ubicacion, estado, pdf_data, pdf_nombre) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [nombre, ubicacion, estado, pdf_data, pdf_nombre]
        );
        
        // Historial inicial
        await pool.query(
            'INSERT INTO historial (equipo_id, encargado, descripcion, estado_en_ese_momento) VALUES ($1, $2, $3, $4)',
            [result.rows[0].id, 'Sistema', 'Equipo creado', estado]
        );
        
        res.json({ mensaje: 'Creado', id: result.rows[0].id });
    } catch (err) { res.status(500).send(err.message); }
});

// 4. Actualizar Equipo (Y subir/cambiar PDF)
app.put('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, ubicacion, estado, ultima_revision, pdf_data, pdf_nombre } = req.body;
        const fechaFinal = ultima_revision ? ultima_revision : new Date();

        
        await pool.query(
            `UPDATE equipos SET 
                nombre=$1, 
                ubicacion=$2, 
                estado=$3, 
                ultima_revision=$4,
                pdf_data = COALESCE($5, pdf_data),
                pdf_nombre = COALESCE($6, pdf_nombre)
             WHERE id=$7`,
            [nombre, ubicacion, estado, fechaFinal, pdf_data, pdf_nombre, id]
        );
        
        res.json({ mensaje: 'Actualizado correctamente' });
    } catch (err) { res.status(500).send(err.message); }
});

// 5. Agregar Revisión (Historial)
app.post('/api/equipos/:id/revision', async (req, res) => {
    try {
        const { id } = req.params;
        const { encargado, descripcion, fecha, nuevo_estado } = req.body;
        
        const fechaFinal = fecha ? fecha : new Date();

        await pool.query(
            'INSERT INTO historial (equipo_id, encargado, descripcion, fecha, estado_en_ese_momento) VALUES ($1, $2, $3, $4, $5)',
            [id, encargado, descripcion, fechaFinal, nuevo_estado]
        );

        await pool.query('UPDATE equipos SET estado=$1, ultima_revision=$2 WHERE id=$3', [nuevo_estado, fechaFinal, id]);
        
        res.json({ mensaje: 'Revisión agregada' });
    } catch (err) { res.status(500).send(err.message); }
});

app.listen(port, () => console.log(`Servidor listo en ${port}`));