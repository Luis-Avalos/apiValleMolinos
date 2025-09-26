const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ASCENSOS / DESCENSOS

exports.getAllSubidasbajadas = async (req, res) => {
  try {
    const result = await prisma.bitacora_cupos.aggregate({
      _sum: {
        ascensos: true,
        descensos: true
      }
    });

    res.json({
      total_ascensos: result._sum.ascensos || 0,
      total_descensos: result._sum.descensos || 0
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener la data', 
      details: error.message 
    });
  }
};

// TOTAL DE UNIDADES POR ESTADO
exports.getUnidadesStats = async (req, res) => {
  try {
    const total = await prisma.unidades.count();

    const estados = await prisma.unidades.groupBy({
      by: ['estado'],
      _count: { estado: true }
    });

    res.json({
      total_unidades: total,
      estados: estados.map(e => ({
        estado: e.estado,
        total: e._count.estado
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener las unidades', 
      details: error.message 
    });
  }
};

// TOTAL DE CONDUCTORES
exports.getConductoresStats = async (req, res) => {
  try {
    const total = await prisma.conductores.count();

    res.json({
      total_conductores: total
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener los conductores', 
      details: error.message 
    });
  }
};

// TOTAL DE VIAJES POR ESTADO
exports.getViajesStats = async (req, res) => {
  try {
    const total = await prisma.viajes.count();

    const estados = await prisma.viajes.groupBy({
      by: ['estado'],
      _count: { estado: true }
    });

    res.json({
      total_viajes: total,
      estados: estados.map(e => ({
        estado: e.estado,
        total: e._count.estado
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener los viajes', 
      details: error.message 
    });
  }
};
