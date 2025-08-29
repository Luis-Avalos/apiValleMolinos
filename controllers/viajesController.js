const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtener todos los viajes
 */
exports.getViajes = async (req, res) => {
  try {
    const viajes = await prisma.viajes.findMany({
      include: {
        unidades: { include: { conductores: true } },
        rutas: {
      select: {
        nombre: true
      }
    },
        vueltas: true
      }
    });
    res.json(viajes);
  } catch (error) {
    console.error('Error al obtener viajes:', error);
    res.status(500).json({ error: 'Error al obtener viajes', details: error.message });
  }
};

/**
 * Obtener viaje por ID
 */
exports.getViajeById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const viaje = await prisma.viajes.findUnique({
      where: { id },
      include: {
        unidades: { include: { conductores: true } },
        rutas: true,
        vueltas: true
      }
    });

    if (!viaje) return res.status(404).json({ error: 'Viaje no encontrado' });

    res.json(viaje);
  } catch (error) {
    console.error('Error al obtener viaje:', error);
    res.status(500).json({ error: 'Error al obtener viaje', details: error.message });
  }
};


/**
 * Crear un nuevo viaje (solo ruta)
 */
exports.createViaje = async (req, res) => {
  try {
    const { ruta_id, fecha, hora_inicio, hora_fin } = req.body;
    if (!ruta_id || !fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Se requiere ruta_id, fecha, hora_inicio y hora_fin' });
    }

    const viaje = await prisma.viajes.create({
      data: {
        ruta_id,
        fecha: new Date(fecha),
        hora_inicio: new Date(hora_inicio),
        hora_fin: new Date(hora_fin),
        estado: 'pendiente'
      }
    });

    res.status(201).json(viaje);
  } catch (error) {
    console.error('Error al crear viaje:', error);
    res.status(500).json({ error: 'Error al crear viaje', details: error.message });
  }
};


/**
 * Asignar conductor y unidad a un viaje
 */
exports.asignarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { conductorId, unidadId } = req.body;

    if (isNaN(id) || !conductorId || !unidadId) {
      return res.status(400).json({ error: 'Se requiere id del viaje, conductorId y unidadId válidos' });
    }

    //  Asignar conductor a la unidad
    await prisma.unidades.update({
      where: { id: unidadId },
      data: { conductor_id: conductorId }
    });

    // Asignar unidad al viaje
    const viaje = await prisma.viajes.update({
      where: { id },
      data: { unidad_id: unidadId },
      include: {
        unidades: { include: { conductores: true } },
        rutas: true
      }
    });

    res.json(viaje);
  } catch (error) {
    console.error('Error al asignar viaje:', error);
    res.status(500).json({ error: 'Error al asignar viaje', details: error.message });
  }
};

/**
 * Iniciar viaje (cambia estado y crea primera vuelta)
 */
exports.iniciarViaje = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    // Crear primera vuelta
 const primeraVuelta = await prisma.vueltas.create({
  data: {
    viaje_id: id,
    numero_vuelta: 1,
    hora_inicio_estimada: new Date(),
    hora_fin_estimada: new Date(new Date().getTime() + 3600 * 1000), // 1 hora después
    completada: false
  }
})


    // Actualizar estado del viaje
 const viaje = await prisma.viajes.update({
  where: { id },
  data: { estado: 'en_curso' }, // debe coincidir con el CHECK
  include: { vueltas: true }
});


    res.json({ viaje, primeraVuelta });
  } catch (error) {
    console.error('Error al iniciar viaje:', error);
    res.status(500).json({ error: 'Error al iniciar viaje', details: error.message });
  }
};


/**
 * Finalizar viaje (cambia estado y última vuelta)
 */
exports.finalizarViaje = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    // Obtener última vuelta
    const ultimaVuelta = await prisma.vueltas.findFirst({
      where: { viaje_id: id },
      orderBy: { numero_vuelta: 'desc' }
    });

    if (ultimaVuelta) {
      await prisma.vueltas.update({
        where: { id: ultimaVuelta.id },
        data: { completada: true, hora_fin_estimada: new Date() }
      });
    }

    // Actualizar viaje
    const viaje = await prisma.viajes.update({
      where: { id },
      data: { estado: 'finalizado' },
      include: { vueltas: true }
    });

    res.json(viaje);
  } catch (error) {
    console.error('Error al finalizar viaje:', error);
    res.status(500).json({ error: 'Error al finalizar viaje', details: error.message });
  }
};

/**
 * Crear nueva vuelta dentro de un viaje
 */
exports.crearVuelta = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    // Obtener última vuelta
    const ultimaVuelta = await prisma.vueltas.findFirst({
      where: { viaje_id: id },
      orderBy: { numero_vuelta: 'desc' }
    });

   const ahora = new Date();
      const nuevaVuelta = await prisma.vueltas.create({
        data: {
          viaje_id: 5,
          numero_vuelta: 2,
          hora_inicio_estimada: ahora,
          hora_fin_estimada: ahora,  // temporalmente igual al inicio
          completada: false
        }
      });


    res.json(nuevaVuelta);
  } catch (error) {
    console.error('Error al crear vuelta:', error);
    res.status(500).json({ error: 'Error al crear vuelta', details: error.message });
  }
};

/**
 * Actualizar vuelta (ej. finalizarla)
 */
exports.actualizarVuelta = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { completada } = req.body;

    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const vuelta = await prisma.vueltas.update({
      where: { id },
      data: {
        completada: completada ?? false,
        hora_fin_estimada: completada ? new Date() : undefined
      }
    });

    res.json(vuelta);
  } catch (error) {
    console.error('Error al actualizar vuelta:', error);
    res.status(500).json({ error: 'Error al actualizar vuelta', details: error.message });
  }
};


/**
 * Obtener todos los viajes de un conductor
 */
exports.getViajesConductor = async (req, res) => {
  try {
    const conductorId = Number(req.params.id);
    if (isNaN(conductorId)) {
      return res.status(400).json({ error: 'ID de conductor inválido' });
    }

    const viajes = await prisma.viajes.findMany({
      where: {
        unidades: {
          conductor_id: conductorId
        }
      },
      include: {
        unidades: { include: { conductores: true } },
        rutas: true,
        vueltas: true
      }
    });

    if (!viajes || viajes.length === 0) {
      return res.status(404).json({ error: 'No se encontraron viajes para este conductor' });
    }

    res.json(viajes);
  } catch (error) {
    console.error('Error al obtener viajes del conductor:', error);
    res.status(500).json({ error: 'Error al obtener viajes del conductor', details: error.message });
  }
};
