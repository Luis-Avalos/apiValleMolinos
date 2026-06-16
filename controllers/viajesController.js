const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Pool } = require('pg');

const { DateTime } = require("luxon");

const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: new AWS.Endpoint(process.env.AWS_URL),
  s3ForcePathStyle: true,
  signatureVersion: "v4",
  region: "us-east-1"
});

function generarUrlFirmada(key) {

  if (!key) return null;

  try {

    if (key.startsWith("http")) {
      const url = new URL(key);
      key = url.pathname
        .replace(`/${process.env.AWS_BUCKET}/`, "")
        .replace(/^\/+/, "");
    }

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Expires: 60 * 60 * 4
    };

    return s3.getSignedUrl("getObject", params);

  } catch (error) {

    console.error("Error generando URL:", error);
    return null;

  }
}

function toMexico(date) {
  if (!date) return null;
  return DateTime.fromJSDate(date, { zone: "utc" })
    .setZone("America/Mexico_City")
    .toISO(); 
}

const pool = new Pool({
  host: process.env.DB_HOST || '10.10.23.78',
  user: process.env.DB_USER || 'geo_luavalos',
  password: process.env.DB_PASS || 'luisernesto',
  database: process.env.DB_NAME || 'zapopan_geo_pg',
  port: process.env.DB_PORT || 5432,
  search_path: 'vallemolinostest'
});

/* ===============================
    OBTENER TODOS LOS VIAJES
   =============================== */
exports.getViajes = async (req, res) => {
  try {

    const viajes = await prisma.viajes.findMany({
      include: {
        unidades: true,
        conductores: true,
        rutas: true,
        bitacora_cupos: true
      },
      orderBy: { id: "desc" },
    });

    const viajesConFotos = viajes.map(v => {

      if (v.conductores?.foto_perfil_url) {
          v.conductores.foto_perfil_url =
            generarUrlFirmada(
              v.conductores.foto_perfil_url
            );
      }
      return v;
    });

    res.json(viajesConFotos);

  } catch (error) {

    res.status(500).json({
      error: "Error al obtener viajes",
      details: error.message
    });

  }
};

/* ===============================
    OBTENER VIAJE POR ID
   =============================== */
exports.getViajeById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    let viaje = await prisma.viajes.findUnique({
      where: { id },
      include: {
        unidades:true,
        conductores:true,
        rutas:true,
        bitacora_cupos:true
      },
    });

    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado' });

   
    viaje = {
      ...viaje,
      fechainicioviaje: toMexico(viaje.fechainicioviaje),
    };

    if (viaje.conductores?.foto_perfil_url) {
        viaje.conductores.foto_perfil_url =
          generarUrlFirmada(
            viaje.conductores.foto_perfil_url
          );
      }

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viaje', details: error.message });
  }
};
/* ===============================
    CREAR UN NUEVO VIAJE
   =============================== */
exports.createViaje = async (req, res) => {
  try {
    const {
      ruta_id,
      fecha,
      hora_inicio,
      hora_fin,
      turno,
      unidad_id,
      conductor_id,
      total_vueltas_programadas,
      estado,
    } = req.body;

    if (!ruta_id || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: "Faltan datos necesarios" });
    }

    const conflicto = await prisma.viajes.findFirst({
      where: {
        unidad_id: unidad_id ? parseInt(unidad_id) : null,
        fecha: new Date(fecha),
        turno: turno
      }
    });

    if (conflicto) {
      return res.status(400).json({
        error: "Esta unidad ya tiene un viaje asignado en este turno y fecha"
      });
    }

    // Crear el viaje
    const viaje = await prisma.viajes.create({
      data: {
        ruta_id: parseInt(ruta_id),
        fecha: new Date(fecha),
        hora_inicio: new Date(hora_inicio),
        hora_fin: new Date(hora_fin),
        turno,
        unidad_id: unidad_id ? parseInt(unidad_id) : null,
        conductor_id: conductor_id ? parseInt(conductor_id) : null,
        estado: estado || "pendiente",
        total_vueltas_programadas: total_vueltas_programadas
          ? parseInt(total_vueltas_programadas)
          : 1,
      },
      include: {
        unidades:true,
        conductores:true,
        rutas:true
      },
    });

    res.status(201).json(viaje);
  } catch (error) {
    console.error("Error al crear viaje:", error);
    res
      .status(500)
      .json({ error: "Error al crear viaje", details: error.message });
  }
};

/* ===============================
    ASIGNAR CONDUCTOR / UNIDAD
   =============================== */
exports.asignarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { conductorId, unidadId } = req.body;

    if (isNaN(id) || !conductorId || !unidadId) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

   const viaje = await prisma.viajes.update({
     where: { 
        id, 
      },

     data: {
       unidad_id: unidadId,
       conductor_id: conductorId,
     },

     include: {
       unidades: true,
       conductores: true,
       rutas: true,
     },
   });

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar viaje', details: error.message });
  }
};

/* ===============================
    INICIAR VIAJE
   =============================== */
exports.iniciarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const fechaInicio = new Date();
    const viaje = await prisma.viajes.update({
      where: { id },
      data: { 
        estado: 'en_curso',
        fechainicioviaje: fechaInicio
      },
     include:{ unidades:true, conductores:true, rutas:true }
    });
    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar viaje', details: error.message });
  }
};

/* ===============================
    FINALIZAR VIAJE
   =============================== */
exports.finalizarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.update({
      where: { id },
      data: { estado: 'finalizado' },
     include:{ unidades:true, conductores:true, rutas:true }
    });

    res.json(viaje);
  } catch (error) {
    res.status(500).json({ error: 'Error al finalizar viaje', details: error.message });
  }
};

/* ===============================
    VIAJES POR CONDUCTOR
   =============================== */
exports.getViajesConductor = async (req, res) => {
  try {
    const conductorId = Number(req.params.id);
    if (isNaN(conductorId)) return res.status(400).json({ error: 'ID conductor inválido' });

    const viajes = await prisma.viajes.findMany({
      where: { conductor_id: conductorId },
      include:{ unidades:true, conductores:true, rutas:true }
    });

    res.json(viajes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes', details: error.message });
  }
};

/* ===============================
    ACTUALIZAR VIAJE
   =============================== */
exports.updateViaje = async (req, res) => {
  const client = await pool.connect();

  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const {
      fecha,
      hora_inicio,
      hora_fin,
      turno,
      unidad_id,
      conductor_id,
      ruta_id,
      estado,
      pasajeros_actuales,
      latitud,
      longitud,
    ciudadanosfaltante 
    } = req.body;

    // Verifica existencia del viaje
    const viajeActual = await prisma.viajes.findUnique({
      where: { id },
      select: { pasajeros_actuales: true },
    });
    if (!viajeActual) return res.status(404).json({ error: 'Viaje no encontrado' });

    // Prepara los datos a actualizar
    const dataToUpdate = {};
    if (fecha) dataToUpdate.fecha = new Date(fecha);
    if (hora_inicio) dataToUpdate.hora_inicio = new Date(hora_inicio);
    if (hora_fin) dataToUpdate.hora_fin = new Date(hora_fin);
    if (turno) dataToUpdate.turno = turno;
    if (estado) dataToUpdate.estado = estado;

    const nuevosPasajeros =
      pasajeros_actuales !== undefined && pasajeros_actuales !== null
        ? Number(pasajeros_actuales)
        : undefined;

    if (!isNaN(nuevosPasajeros)) {
      dataToUpdate.pasajeros_actuales = nuevosPasajeros;
    }

    if (unidad_id !== undefined && unidad_id !== null) { dataToUpdate.unidad_id = parseInt(unidad_id); }
    if (ruta_id) dataToUpdate.ruta_id = parseInt(ruta_id);
    if (conductor_id !== undefined && conductor_id !== null) { dataToUpdate.conductor_id = parseInt(conductor_id); }
    
    //  Actualiza viaje con Prisma
    const viaje = await prisma.viajes.update({
      where: { id },
      data: dataToUpdate,
      include:{ unidades:true, conductores:true, rutas:true, bitacora_cupos:true },
    });

    //  Registra en bitácora con SQL nativo (evita ST_MakePoint de Prisma)
    if (!isNaN(nuevosPasajeros)) {
      const anterior = Number(viajeActual.pasajeros_actuales) || 0;
      const diferencia = nuevosPasajeros - anterior;

      const ascensos = diferencia > 0 ? diferencia : 0;
      const descensos = diferencia < 0 ? Math.abs(diferencia) : 0;

      const faltantes = ciudadanosfaltante ? Number(ciudadanosfaltante) : 0;
    
 // Si no hay cambios en pasajeros y tampoco faltantes  no se registra
      if (diferencia !== 0) {
        
        const lat = parseFloat(latitud) || 0.0;
        const lon = parseFloat(longitud) || 0.0;

        const query = `
          INSERT INTO vallemolinostest.bitacora_cupos 
          (viaje_id, latitud, longitud, ascensos, descensos, ciudadanosfaltante, fecha_hora)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `;

        await client.query(query, [id, lat, lon, ascensos, descensos, faltantes]);
        console.log('Bitácora insertada con faltantes/ascensos/descensos');
      }
    }

    res.json(viaje);
  } catch (error) {
    console.error(' Error al actualizar viaje:', error);
    res.status(500).json({ error: 'Error al actualizar viaje', details: error.message });
  } finally {
    client.release();
  }
};

/* ===============================
   OBTENER BITÁCORA DE CUPOS
   =============================== */
exports.getSubidas = async (req, res) => {
  try {
    const bitacoracupos = await prisma.bitacora_cupos.findMany({
      select: {
        id: true,
        viaje_id: true,
        latitud: true,
        longitud: true,
        ascensos: true,
        descensos: true,
        fecha_hora: true,
      },
      orderBy: { fecha_hora: 'desc' },
    });
    res.json(bitacoracupos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener bitácora', details: error.message });
  }
};

/* ===============================
   OBTENER VIAJES HASTA UNA FECHA
   =============================== */
exports.getViajesHastaFecha = async (req, res) => {
  try {

    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({
        error: "Debe enviar una fecha. Ejemplo: ?fecha=2026-05-25"
      });
    }

    const query = `
      SELECT
        b.id,
        c.numero_economico,
        d.nombre,
        b.fecha,
        b.hora_inicio,
        b.hora_fin,
        b.total_vueltas_programadas,
        b.vueltas_completadas,
        b.pasajeros_actuales,
        b.creado_en,
        b.fechainicioviaje,
        b.vueltascompletadasmanual
      FROM vallemolinostest.viajes AS b
      LEFT JOIN vallemolinostest.unidades AS c
        ON b.unidad_id = c.id
      LEFT JOIN vallemolinostest.rutas AS d
        ON b.ruta_id = d.id
      WHERE b.fecha <= $1
      ORDER BY b.fecha DESC
    `;

    const result = await pool.query(query, [fecha]);

    const viajes = result.rows.map(viaje => ({
      ...viaje,
      fechainicioviaje: toMexico(viaje.fechainicioviaje),
      creado_en: toMexico(viaje.creado_en)
    }));

    res.json(viajes);

  } catch (error) {

    console.error("Error obteniendo viajes:", error);

    res.status(500).json({
      error: "Error al obtener viajes",
      details: error.message
    });

  }
};