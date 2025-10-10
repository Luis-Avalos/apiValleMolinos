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

/**
 *  Función genérica para obtener vehículos por grupo
 */
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
        isdriving: matching.isdriving
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

module.exports = router;
