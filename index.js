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

// Socket.IO sobre ese servidor
const io = new Server(server, {
  cors: { origin: "*" }
});

// Rutas
const authRoutes = require('./routes/authRoutes'); 
const passwordResetRoutes = require('./routes/passwordResetRoutes');
app.use('/api/auth', authRoutes);
app.use('/api', passwordResetRoutes); 

const authRoutesCiudadano = require('./routes/authRoutesCiudadano');
app.use('/api/auth', authRoutesCiudadano); 

const userRoutes = require('./routes/userRoutes');
app.use('/api/conductores', userRoutes);

const ciudadanoRoutes = require('./routes/ciudadanoRoutes');
app.use('/api/ciudadano', ciudadanoRoutes);

const unidadesRoutes = require('./routes/unidadesRoutes');
app.use('/api/unidades', unidadesRoutes);

const rutasRoutes = require('./routes/rutasRoutes');
app.use('/api/rutas', rutasRoutes);

const viajesRoutes = require('./routes/viajesRoutes');
app.use('/api/viajes', viajesRoutes);

const vueltasRoutes = require('./routes/vueltasRoutes');
app.use('/api/vueltas', vueltasRoutes);

const geotabRoutes = require('./routes/gpsEnvivo');
app.use('/api', geotabRoutes);

const incidenciasRoutes = require('./routes/incidenciasRoutes');
app.use('/api/incidencias', incidenciasRoutes);

// Cuando un cliente se conecta
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
});

// `io` para los controladores
app.set("io", io);

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
