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
  return sessionId;
}

router.get('/geotab/vehiculos', async (req, res) => {
  try {
    if (!sessionId) await authenticate();

    const creds = {
      database: GEOTAB_DB,
      sessionId: sessionId,
      userName: GEOTAB_USER
    };


    const dispositivos = await axiosInstance.post(`${server}/apiv1`, {
      method: "Get",
      params: {
        typeName: "Device",
        search: {
          groups: [{ id: "b27E1" }]
        },
        credentials: creds
      }
    });

    const statusInfos = dispositivos.data.result;

    const filtro = statusInfos.map(info => ({
      id: info.id,
      name: info.name,
      licensePlate: info.licensePlate,
      vin: info.vehicleIdentificationNumber,
      groups: info.groups
    }));


    const status = await axiosInstance.post(`${server}/apiv1`, {
      method: "Get",
      params: {
        typeName: "DeviceStatusInfo",
        credentials: creds
      }
    });

    const addressResults = status.data.result;
    
    const coordenadas = filtro.map(f => {
      const matching = addressResults.find(d => d.device.id === f.id);
      if (matching) {
        return {
          x: matching.longitude,
          y: matching.latitude,
          id_dev: matching.device.id,
          speed: matching.speed,
          dateTime: matching.dateTime,
          grupo: f.groups,
          nombre: f.name,
          placas: f.licensePlate,
          identificador: f.vin
        };
      }
      return null;
    }).filter(Boolean);

    res.json(coordenadas);
  } catch (err) {
    console.error("Error obteniendo datos de Geotab:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al obtener datos desde Geotab" });
  }
});

module.exports = router;