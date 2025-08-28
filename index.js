require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());


// Login y reset password de conductores
const authRoutes = require('./routes/authRoutes'); 
const passwordResetRoutes = require('./routes/passwordResetRoutes');

app.use('/api/auth', authRoutes);
app.use('/api', passwordResetRoutes); 

// Login y registro de ciudadanos
const authRoutesCiudadano = require('./routes/authRoutesCiudadano');
app.use('/api/auth', authRoutesCiudadano); 


// RUTAS DE CONDUCTORES
const userRoutes = require('./routes/userRoutes');
app.use('/api/conductores', userRoutes);


// RUTAS DE CIUDADANOS
const ciudadanoRoutes = require('./routes/ciudadanoRoutes');
app.use('/api/ciudadano', ciudadanoRoutes);

// RUTAS DE UNIDADES
const unidadesRoutes = require('./routes/unidadesRoutes');
app.use('/api/unidades', unidadesRoutes);

// RUTAS DE RUTAS
const rutasRoutes = require('./routes/rutasRoutes');
app.use('/api/rutas', rutasRoutes);

//RUTAS DE VIAJES
const viajesRoutes = require('./routes/viajesRoutes');
app.use('/api/viajes', viajesRoutes);

//RUTAS DE VUELTAS
const vueltasRoutes = require('./routes/vueltasRoutes');
app.use('/api/vueltas', vueltasRoutes);


const geotabRoutes = require('./routes/gpsEnvivo');
app.use('/api', geotabRoutes);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
