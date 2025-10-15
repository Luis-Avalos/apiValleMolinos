const express = require('express');
const router = express.Router();
const axios = require('axios');
const https = require('https');

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

const GEOTAB_DB = process.env.GEOTAB_DB;
const GEOTAB_USER = process.env.GEOTAB_USER;
const GEOTAB_PASS = process.env.GEOTAB_PASS;

let sessionId = null;
let server = 'https://my.geotab.com';


async function authenticate() {
  const response = await axiosInstance.post(`${server}/apiv1`, {
    method: "Authenticate",
    params: {
      database: GEOTAB_DB,
      userName: GEOTAB_USER,
      password: GEOTAB_PASS
    }
  });

  sessionId = response.data.result.credentials.sessionId;
  console.log("Autenticado correctamente en Geotab");
  return sessionId;
}

async function obtenerVehiculosPorGrupo(groupId) {
  if (!sessionId) await authenticate();

  const creds = {
    database: GEOTAB_DB,
    sessionId: sessionId,
    userName: GEOTAB_USER
  };

  //  Obtener lista de dispositivos en el grupo
  const dispositivos = await axiosInstance.post(`${server}/apiv1`, {
    method: "Get",
    params: {
      typeName: "Device",
      search: { groups: [{ id: groupId }] },
      credentials: creds
    }
  });

  const listaDispositivos = dispositivos.data.result;
  
  const status = await axiosInstance.post(`${server}/apiv1`, {
    method: "Get",
    params: {
      typeName: "DeviceStatusInfo",
      credentials: creds
    }
  });

  const statusData = status.data.result;

  const coordenadas = listaDispositivos.map(dev => {
    const matching = statusData.find(s => s.device.id === dev.id);
    if (matching) {
      return {
        id_dev: dev.id,
        nombre: dev.name,
        placas: dev.licensePlate || "Sin placas",
        identificador: dev.vehicleIdentificationNumber || "Sin VIN",
        grupo: dev.groups,
        x: matching.longitude,
        y: matching.latitude,
        speed: matching.speed,
        dateTime: matching.dateTime,
        isDriving: matching.isDriving
      };
    }
    return null;
  }).filter(Boolean);

  return coordenadas;
}

router.get('/geotab/vehiculos', async (req, res) => {
  try {
    const data = await obtenerVehiculosPorGrupo("b27E1"); 
    res.json(data);
  } catch (err) {
    console.error("Error en /geotab/vehiculos:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al obtener datos desde Geotab" });
  }
});


router.get('/geotab/vcamioncitozapopan', async (req, res) => {
  try {
    const data = await obtenerVehiculosPorGrupo("b27C0"); 
    res.json(data);
  } catch (err) {
    console.error("Error en /geotab/vcamioncitozapopan:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al obtener datos desde Geotab" });
  }
});

router.get('/geotab/vehiculo/:id', async (req, res) => {
  const { id } = req.params; // ejemplo: b3B6

  try {
    if (!sessionId) await authenticate();

    const creds = {
      database: GEOTAB_DB,
      sessionId: sessionId,
      userName: GEOTAB_USER
    };

    // Obtener info del vehículo
    const dispositivo = await axiosInstance.post(`${server}/apiv1`, {
      method: "Get",
      params: {
        typeName: "Device",
        search: { id }, 
        credentials: creds
      }
    });

    const vehiculo = dispositivo.data.result[0];
    if (!vehiculo) return res.status(404).json({ error: "Vehículo no encontrado" });

    // Obtener su estatus 
    const status = await axiosInstance.post(`${server}/apiv1`, {
      method: "Get",
      params: {
        typeName: "DeviceStatusInfo",
        search: { deviceSearch: { id } },
        credentials: creds
      }
    });

    const statusData = status.data.result[0];

    const data = {
      id_dev: vehiculo.id,
      nombre: vehiculo.name,
      placas: vehiculo.licensePlate || "Sin placas",
      identificador: vehiculo.vehicleIdentificationNumber || "Sin VIN",
      grupo: vehiculo.groups,
      x: statusData?.longitude || null,
      y: statusData?.latitude || null,
      speed: statusData?.speed || 0,
      dateTime: statusData?.dateTime || null,
      isDriving: statusData?.isDriving || false
    };

    res.json(data);

  } catch (err) {
    console.error("Error en /geotab/vehiculo/:id:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al obtener datos del vehículo desde Geotab" });
  }
});


module.exports = router;
