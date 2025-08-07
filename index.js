require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

const passwordResetRoutes = require('./routes/passwordResetRoutes');
app.use('/api', passwordResetRoutes);

const avanceColoniasRoute = require('./routes/avanceColoniasRoute');
app.use('/api', avanceColoniasRoute);

const voboMesaRoute = require('./routes/voboMesaRoute');
app.use('/api', voboMesaRoute);

const voboMesaDistritoRoute = require('./routes/voboMesaDistritoRoute');
app.use('/api', voboMesaDistritoRoute);

const avancePorcentajeColoniasRoute = require('./routes/avancePorcentajeColoniasRoute');
app.use('/api', avancePorcentajeColoniasRoute);

const coloniasRoutes = require('./routes/coloniasRoutes');
app.use('/api/colonias', coloniasRoutes);


const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));