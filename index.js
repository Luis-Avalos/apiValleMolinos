require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Cargar certificados SSL (ajusta las rutas a las reales en tu servidor)
const httpsOptions = {
  key: fs.readFileSync('/etc/ssl/zap.key'),
  cert: fs.readFileSync('/etc/ssl/7cf9a40cef6759dc.crt'),
  ca: fs.readFileSync('/etc/ssl/sf_bundle-g2-g1.crt'),
};

// Crear servidores HTTP y HTTPS
const httpServer = http.createServer(app);
const httpsServer = https.createServer(httpsOptions, app);

// Socket.IO sobre ambos
const io = new Server(httpServer, { cors: { origin: "*" } });
const ioHttps = new Server(httpsServer, { cors: { origin: "*" } });

// Configurar ambos servidores Socket.IO
io.on("connection", (socket) => console.log("Cliente HTTP conectado:", socket.id));
ioHttps.on("connection", (socket) => console.log("Cliente HTTPS conectado:", socket.id));

// `io` principal disponible para tus controladores
app.set("io", ioHttps);

// =======================
// RUTAS DEL BACKEND
// =======================
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

// Registrar rutas
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

// =======================
// RUTAS DE PRUEBA
// =======================
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

// =======================
// INICIAR SERVIDORES
// =======================
const HTTP_PORT = process.env.PORT || 3004;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

httpServer.listen(HTTP_PORT, () =>
  console.log(`🌐 Servidor HTTP corriendo en http://localhost:${HTTP_PORT}`)
);

httpsServer.listen(HTTPS_PORT, () =>
  console.log(` Servidor HTTPS corriendo en https://localhost:${HTTPS_PORT}`)
);
