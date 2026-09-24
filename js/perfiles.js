// perfiles.js — de quién es la app que se está abriendo.
// El index.html de cada una pone window.PERFIL antes de cargar el código; aquí se
// decide todo lo que cambia entre una y otra: base de datos, color y qué pantallas hay.
// La base de datos lleva nombre distinto, así que las dos pueden convivir en el mismo
// móvil sin mezclar ni un dato.

const ID = (typeof window !== 'undefined' && window.PERFIL) || 'rocio';

export const PERFILES = {
  rocio: {
    id: 'rocio', nombre: 'Rocío', db: 'entreno-nutricion', tema: 'mixto', base: './',
    comida: true,  // pestaña Comida, objetivos y recetas
    cuerpo: true,  // peso, pasos y medidas
  },
  aida: {
    // Su app vive en /aida, así que las fotos y demás están un nivel por encima.
    id: 'aida', nombre: 'Aida', db: 'entreno-aida', tema: 'claro-salvia', base: '../',
    comida: false, // no quiere controlar lo que come
    cuerpo: false, // no se pesa ni se mide
  },
};

export const QUIEN = PERFILES[ID] || PERFILES.rocio;
