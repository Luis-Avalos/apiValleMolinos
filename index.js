require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(bodyParser.json());


const server = http.createServer(app);


const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
});

app.set("io", io);

// ==========================================
// RUTAS
// ==========================================
const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const authRoutesCiudadano = require('./routes/authRoutesCiudadano');
const userRoutes = require('./routes/userRoutes');
const ciudadanoRoutes = require('./routes/ciudadanoRoutes');
const unidadesRoutes = require('./routes/unidadesRoutes');
const rutasRoutes = require('./routes/rutasRoutes');
const viajesRoutes = require('./routes/viajesRoutes');
const bitacora_estadisticas = require('./routes/bitacoraEstadisticasRoutes');
const vueltasRoutes = require('./routes/vueltasRoutes');
const geotabRoutes = require('./routes/gpsEnvivo');
const incidenciasRoutes = require('./routes/incidenciasRoutes');
const dashboard = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api', passwordResetRoutes);
app.use('/api/auth', authRoutesCiudadano);
app.use('/api/conductores', userRoutes);
app.use('/api/ciudadano', ciudadanoRoutes);
app.use('/api/unidades', unidadesRoutes);
app.use('/api/rutas', rutasRoutes);
app.use('/api/viajes', viajesRoutes);
app.use('/api/estadisticaViajes', bitacora_estadisticas);
app.use('/api/vueltas', vueltasRoutes);
app.use('/api', geotabRoutes);
app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/dashboard', dashboard);

// ==========================================
// Rutas de prueba
// ==========================================
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor accesible correctamente',
    protocolo: req.protocol,
    puerto_servidor: req.socket.localPort,
    ip_cliente: req.ip,
    fecha: new Date().toISOString()
  });
});

app.post('/api/test-post', (req, res) => {
  console.log('POST recibido:', req.body);
  res.json({
    status: 'ok',
    message: 'POST recibido correctamente',
    body: req.body,
    protocolo: req.protocol
  });
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
