// seed.js — datos de partida: rutina, ejercicios con guía de técnica, biblioteca de
// alimentos y recetas. Solo se cargan la primera vez; luego se editan desde Ajustes.

export const PERFIL = {
  altura: 170,
  pesoInicial: 85,
  ritmoMin: 0.5, // kg por semana
  ritmoMax: 0.7,
  pasosObjetivo: 10000,
  limiteSesionMin: 55,
};

export const OBJETIVOS = {
  kcalEntreno: 1815,
  kcalDescanso: 1680,
  proteina: 145, // no baja los días sin entrenar
  grasa: 62,
  sueloKcal: 1600,
  grasaMinima: 55,
  avisoProteinaTarde: 0.6, // fracción del objetivo a partir de las 17:00
  horaAvisoProteina: 17,
};

export const TOMAS = [
  { id: 'desayuno', nombre: 'Desayuno', hora: '6:00', kcal: 320, prot: 28 },
  { id: 'media-manana', nombre: 'Media mañana', hora: '9:30-10:00', kcal: 380, prot: 14 },
  { id: 'comida', nombre: 'Comida', hora: '13:00', kcal: 550, prot: 45 },
  { id: 'merienda', nombre: 'Merienda', hora: '18:30', kcal: 150, prot: 15 },
  { id: 'cena', nombre: 'Cena', hora: '21:00', kcal: 415, prot: 48 },
];

export const REGLAS = [
  'Pesar en crudo. La carne pierde un 25-30% al cocinarse.',
  'Contar el aceite siempre. Una cucharada son 90 kcal y en un refrito no queda nada en la sartén.',
];

// Entradas rápidas: un toque y registrado.
export const RAPIDAS = [
  {
    id: 'catering', nombre: 'Comida catering oficina', toma: 'comida',
    kcal: 550, prot: 45, grasa: 20, hc: 48,
    nota: 'Estimación fija: no se puede pesar.',
  },
  {
    id: 'sushi', nombre: 'Buffet de sushi', toma: 'cena',
    kcal: 1400, prot: 70, grasa: 40, hc: 190, fuera: true,
    nota: 'Comida fuera semanal. El desvío lo repartes tú desde Progreso.',
  },
];

const yt = (n) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(n + ' técnica ejecución');

// tipo: 'peso' = carga en kg | 'corporal' = peso corporal, la carga es lastre | 'tantear' = sin peso inicial
export const EJERCICIOS = [
  // ---------- Sesión A ----------
  {
    id: 'jalon-prono', nombre: 'Jalón al pecho, agarre prono', repMin: 8, repMax: 12, rir: '2',
    pesoInicial: 30, incremento: 2.5, descanso: 120, tipo: 'peso',
    claves: [
      'Manos algo más anchas que los hombros, agarre prono.',
      'Pecho alto: la barra baja a la clavícula, nunca a la nuca.',
      'Piensa en bajar los codos hacia el suelo, no en tirar con las manos.',
      'Sube controlado y deja que el omóplato se estire arriba, sin encoger el hombro.',
    ],
  },
  {
    id: 'remo-sentado', nombre: 'Remo sentado', repMin: 8, repMax: 12, rir: '2',
    pesoInicial: 36, incremento: 2.5, descanso: 120, tipo: 'peso',
    claves: [
      'Pecho alto y espalda neutra: el tronco casi no se mueve.',
      'Codos pegados al cuerpo hasta pasar la línea del torso.',
      'Junta los omóplatos al final y aguanta medio segundo.',
      'Estira los brazos del todo al soltar, sin redondear la espalda.',
    ],
  },
  {
    id: 'press-hombro-maquina', nombre: 'Press hombro en máquina', repMin: 8, repMax: 12, rir: '2',
    pesoInicial: 16, incremento: 2.5, descanso: 90, tipo: 'peso',
    claves: [
      'Asiento a la altura de que las asas queden a la altura del hombro, no más arriba.',
      'Espalda apoyada y costillas abajo, sin arquear la lumbar.',
      'Sube sin bloquear el codo de golpe.',
      'Baja solo hasta que el codo quede un poco por debajo del hombro y para ahí (hombro izquierdo).',
    ],
  },
  {
    id: 'elev-laterales', nombre: 'Elevaciones laterales, mancuernas a dos manos', repMin: 12, repMax: 15, rir: '0-1',
    pesoInicial: 3, incremento: 1, descanso: 60, tipo: 'peso',
    claves: [
      'Pulgar ligeramente hacia arriba, nunca el meñique alto.',
      'Para a la altura del hombro y no subas más.',
      'Codo semiflexionado y fijo: sube el codo, no la mano.',
      'Mancuernas a dos manos, no polea a un brazo (te molesta el hombro izquierdo).',
    ],
  },
  {
    id: 'triceps-sobre-cabeza', nombre: 'Extensión de tríceps sobre la cabeza en polea', repMin: 10, repMax: 12, rir: '0-1',
    pesoInicial: 12, incremento: 2.5, descanso: 60, tipo: 'peso',
    claves: [
      'Codos al frente y pegados a la cabeza: no se abren.',
      'Solo se mueve el antebrazo, el codo se queda quieto.',
      'Da un paso adelante de la polea para que la tracción venga de detrás.',
      'Estira del todo arriba sin bloquear de golpe.',
    ],
  },

  // ---------- Sesión B ----------
  {
    id: 'hip-thrust', nombre: 'Hip thrust en máquina', repMin: 10, repMax: 12, rir: '1-2',
    pesoInicial: 45, incremento: 5, descanso: 120, tipo: 'peso',
    claves: [
      'El borde del respaldo justo debajo del omóplato.',
      'Barbilla metida y costillas abajo: el movimiento es de cadera, la lumbar no se arquea.',
      'Sube empujando con los talones hasta alinear hombro, cadera y rodilla, y aprieta un segundo.',
      'Espinilla vertical arriba: si los pies quedan muy cerca, trabaja el cuádriceps y molesta la rodilla.',
    ],
  },
  {
    id: 'hiperextensiones', nombre: 'Hiperextensiones en banco de 45°', repMin: 12, repMax: 15, rir: '1-2',
    pesoInicial: 0, incremento: 2.5, descanso: 90, tipo: 'corporal', alternativa: 'extension-cadera',
    claves: [
      'Almohadilla justo por debajo de la cadera, para que la cadera pueda doblarse libre.',
      'Baja doblando por la cadera con la espalda neutra, hasta notar el femoral.',
      'Sube solo hasta la línea del cuerpo: nada de hiperextender arriba.',
      'Empieza a peso corporal y añade disco solo cuando pases de 15 repeticiones limpias.',
    ],
  },
  {
    id: 'extension-cadera', nombre: 'Extensión de cadera en máquina (patada de glúteo de pie)', repMin: 12, repMax: 15, rir: '1-2',
    pesoInicial: null, incremento: 2.5, descanso: 90, tipo: 'tantear',
    claves: [
      'Tronco apoyado y firme, sin balancearte para ayudarte.',
      'Empuja con el talón y sube solo hasta la línea del cuerpo.',
      'Aprieta el glúteo un segundo arriba y baja controlado.',
      'Rodilla poco flexionada y fija durante todo el recorrido.',
    ],
  },
  {
    id: 'curl-femoral-sentado', nombre: 'Curl femoral sentado', repMin: 10, repMax: 12, rir: '0-1',
    pesoInicial: 32, incremento: 2.5, descanso: 90, tipo: 'peso',
    claves: [
      'Rodilla alineada con el eje de giro de la máquina.',
      'Almohadilla justo por encima del tobillo, no sobre el gemelo.',
      'Baja los talones con fuerza y vuelve lento, 2-3 segundos.',
      'Glúteo pegado al asiento: si se despega, baja el peso.',
    ],
  },
  {
    id: 'abductores', nombre: 'Abductores en máquina', repMin: 15, repMax: 15, rir: '0-1',
    pesoInicial: null, incremento: 2.5, descanso: 60, tipo: 'tantear',
    claves: [
      'Espalda apoyada; inclinarte un poco hacia delante lleva el trabajo al glúteo medio.',
      'Abre hasta el final del recorrido cómodo y aguanta un segundo.',
      'Vuelve despacio, sin que las placas lleguen a chocar.',
      'Sin balanceo del tronco para ayudarte.',
    ],
  },
  {
    id: 'crunch-maquina', nombre: 'Crunch en máquina', repMin: 12, repMax: 15, rir: '0-1',
    pesoInicial: null, incremento: 2.5, descanso: 60, tipo: 'tantear',
    claves: [
      'Acerca las costillas a la pelvis; no es doblar la cadera.',
      'Exhala al bajar y mete el abdomen.',
      'Vuelve solo hasta antes de que la placa descanse, manteniendo la tensión.',
      'La barbilla no cambia de posición: nada de tirar del cuello.',
    ],
  },

  // ---------- Sesión C ----------
  {
    id: 'jalon-neutro', nombre: 'Jalón agarre neutro', repMin: 10, repMax: 12, rir: '2',
    pesoInicial: 28, incremento: 2.5, descanso: 120, tipo: 'peso',
    claves: [
      'Agarre neutro (palmas enfrentadas), manos a la anchura de los hombros.',
      'Pecho arriba y ligera inclinación atrás, que se mantiene quieta.',
      'Lleva los codos hacia las caderas; el agarre baja a la parte alta del pecho.',
      'Sube en 2 segundos hasta estirar del todo.',
    ],
  },
  {
    id: 'press-pecho-maquina', nombre: 'Press de pecho en máquina', repMin: 10, repMax: 12, rir: '2',
    pesoInicial: 22, incremento: 2.5, descanso: 120, tipo: 'peso',
    claves: [
      'Asiento de forma que las asas queden a la altura media del pecho, no del cuello.',
      'Omóplatos juntos y apoyados en el respaldo todo el movimiento.',
      'Empuja sin bloquear el codo y sin adelantar el hombro al final.',
      'Vuelve solo hasta que la mano quede en la línea del pecho, no más atrás.',
    ],
  },
  {
    id: 'deltoides-posterior', nombre: 'Deltoides posterior en máquina (pájaros)', repMin: 12, repMax: 15, rir: '0-1',
    pesoInicial: null, incremento: 2.5, descanso: 60, tipo: 'tantear',
    claves: [
      'Pecho apoyado y hombros bajos, lejos de las orejas.',
      'Abre con los codos, no con las manos.',
      'Para cuando los brazos lleguen a la línea del cuerpo.',
      'Peso bajo y repeticiones limpias: aquí el balanceo no aporta nada.',
    ],
  },
  {
    id: 'triceps-polea', nombre: 'Extensión de tríceps en polea', repMin: 10, repMax: 12, rir: '0-1',
    pesoInicial: 18, incremento: 2.5, descanso: 60, tipo: 'peso',
    claves: [
      'Codos pegados al costado y fijos: solo se mueve el antebrazo.',
      'Tronco casi vertical, con una ligera inclinación adelante.',
      'Estira del todo abajo y aprieta un segundo.',
      'Sube controlada hasta que el antebrazo pase la horizontal.',
    ],
  },
  {
    id: 'curl-biceps-maquina', nombre: 'Curl bíceps en máquina', repMin: 10, repMax: 12, rir: '0-1',
    pesoInicial: null, incremento: 2.5, descanso: 60, tipo: 'tantear',
    claves: [
      'Codo alineado con el eje de la máquina y pegado a la almohadilla.',
      'Sube sin despegar el codo ni echar el cuerpo atrás.',
      'Baja en 2-3 segundos hasta casi estirar del todo.',
      'Muñeca neutra, ni doblada hacia atrás.',
    ],
  },

  // ---------- Sesión D ----------
  {
    id: 'prensa', nombre: 'Prensa, recorrido hasta 90°', repMin: 10, repMax: 12, rir: '2',
    pesoInicial: 85, incremento: 5, descanso: 120, tipo: 'peso',
    claves: [
      'Baja solo hasta 90° de flexión de rodilla, ni un grado más, por el menisco.',
      'Si los talones se despegan de la plataforma, has bajado demasiado.',
      'Pies a la anchura de la cadera y algo altos en la plataforma: quita recorrido a la rodilla.',
      'Empuja con mediopié y talón, y no bloquees la rodilla arriba.',
    ],
  },
  {
    id: 'extension-cuadriceps', nombre: 'Extensión de cuádriceps', repMin: 12, repMax: 15, rir: '0-1',
    pesoInicial: 45, incremento: 2.5, descanso: 90, tipo: 'peso',
    claves: [
      'Arranca desde 90°, sin dejar caer la pierna más atrás entre repeticiones.',
      'Ajusta el respaldo para que la rodilla coincida con el eje de giro.',
      'Sube hasta estirar y aguanta un segundo arriba.',
      'Baja controlada y frena en los 90°: ahí termina la repetición.',
    ],
  },
  {
    id: 'curl-femoral-tumbado', nombre: 'Curl femoral tumbado', repMin: 10, repMax: 12, rir: '0-1',
    pesoInicial: 30, incremento: 2.5, descanso: 90, tipo: 'peso',
    claves: [
      'Cadera pegada al banco; si se despega, baja el peso.',
      'Almohadilla justo por encima del tobillo.',
      'Sube hasta el final y baja en 2-3 segundos.',
      'Punta del pie hacia la espinilla para que no se meta el gemelo.',
    ],
  },
  {
    id: 'gemelo-de-pie', nombre: 'Gemelo de pie', repMin: 12, repMax: 15, rir: '0-1',
    pesoInicial: null, incremento: 2.5, descanso: 60, tipo: 'tantear',
    claves: [
      'Recorrido completo: baja el talón hasta estirar y sube hasta la punta.',
      'Un segundo de pausa arriba y otro abajo, sin rebotar.',
      'Rodilla estirada pero sin bloquear.',
      'Peso en el dedo gordo, sin dejar caer el tobillo hacia fuera.',
    ],
  },
];

for (const e of EJERCICIOS) e.youtube = yt(e.nombre);

// La rutina: qué ejercicios y cuántas series en cada sesión, en orden.
export const RUTINA = {
  A: {
    nombre: 'Torso, tirón y hombro',
    ejercicios: [
      { id: 'jalon-prono', series: 3 },
      { id: 'remo-sentado', series: 3 },
      { id: 'press-hombro-maquina', series: 3 },
      { id: 'elev-laterales', series: 3 },
      { id: 'triceps-sobre-cabeza', series: 3 },
    ],
  },
  B: {
    nombre: 'Pierna, cadera',
    ejercicios: [
      { id: 'hip-thrust', series: 4 },
      { id: 'hiperextensiones', series: 3 },
      { id: 'curl-femoral-sentado', series: 3 },
      { id: 'abductores', series: 2 },
      { id: 'crunch-maquina', series: 3 },
    ],
  },
  C: {
    nombre: 'Torso, empuje y brazo',
    ejercicios: [
      { id: 'jalon-neutro', series: 3 },
      { id: 'press-pecho-maquina', series: 3 },
      { id: 'deltoides-posterior', series: 3 },
      { id: 'triceps-polea', series: 3 },
      { id: 'curl-biceps-maquina', series: 3 },
    ],
  },
  D: {
    nombre: 'Pierna, rodilla controlada',
    ejercicios: [
      { id: 'prensa', series: 4 },
      { id: 'extension-cuadriceps', series: 3 },
      { id: 'curl-femoral-tumbado', series: 3 },
      { id: 'gemelo-de-pie', series: 3 },
      { id: 'crunch-maquina', series: 3 },
    ],
  },
};

export const ORDEN_SESIONES = ['A', 'B', 'C', 'D'];

// ---------------------------------------------------------------- alimentos
// Valores por 100 g salvo medida 'ml' (por 100 ml) o 'ud' (los valores son por unidad).
// exacto: true = tomado de la etiqueta del producto. El resto son valores de tabla:
// si tienes el envase delante, gana la etiqueta.
// racion = cantidad habitual, para el botón rápido. gramosUnidad = peso de una unidad.
export const ALIMENTOS = [
  // --- Lácteos y proteína en polvo ---
  { nombre: 'Cottage 0% (Carrefour)', cat: 'Lácteos', kcal: 68, prot: 12.3, grasa: 0.1, hc: 4.5, fibra: 0, sal: 0.6, medida: 'g', racion: 120, exacto: true },
  { nombre: 'Queso batido 0%', cat: 'Lácteos', kcal: 47, prot: 8, grasa: 0.2, hc: 4, fibra: 0, sal: 0.1, medida: 'g', racion: 200 },
  { nombre: 'Kéfir natural', cat: 'Lácteos', kcal: 65, prot: 3.3, grasa: 3.5, hc: 4.3, fibra: 0, sal: 0.1, medida: 'g', racion: 250 },
  { nombre: 'Leche desnatada sin lactosa', cat: 'Lácteos', kcal: 34, prot: 3.1, grasa: 0.3, hc: 4.7, fibra: 0, sal: 0.13, medida: 'ml', racion: 200, exacto: true },
  { nombre: 'Yogur griego ligero', cat: 'Lácteos', kcal: 60, prot: 5, grasa: 2, hc: 5, fibra: 0, sal: 0.15, medida: 'g', racion: 100 },
  { nombre: 'Whey Prime en polvo', cat: 'Lácteos', kcal: 387, prot: 81, grasa: 5.2, hc: 4.1, fibra: 0, sal: 0.3, medida: 'g', racion: 25, exacto: true, nota: '2 scoops = 25 g de producto, no 50.' },
  { nombre: 'Mozzarella rallada', cat: 'Lácteos', kcal: 260, prot: 22, grasa: 18, hc: 2, fibra: 0, sal: 1.4, medida: 'g', racion: 30 },
  { nombre: 'Huevo M', cat: 'Lácteos', kcal: 75, prot: 6.5, grasa: 5, hc: 0.4, fibra: 0, sal: 0.15, medida: 'ud', racion: 2, nota: 'Unidad de 55 g.' },

  // --- Pescado y marisco ---
  { nombre: 'Atún al natural, escurrido', cat: 'Pescado', kcal: 110, prot: 24, grasa: 1, hc: 0, fibra: 0, sal: 1, medida: 'g', racion: 55 },
  { nombre: 'Berberechos, escurridos', cat: 'Pescado', kcal: 53, prot: 8.4, grasa: 0, hc: 4.8, fibra: 0, sal: 1.4, medida: 'g', racion: 60, exacto: true },
  { nombre: 'Anchoas en AOVE, escurridas', cat: 'Pescado', kcal: 200, prot: 26, grasa: 10, hc: 0, fibra: 0, sal: 5, medida: 'g', racion: 15 },
  { nombre: 'Merluza', cat: 'Pescado', kcal: 85, prot: 17, grasa: 1.5, hc: 0, fibra: 0, sal: 0.15, medida: 'g', racion: 200 },
  { nombre: 'Jurel', cat: 'Pescado', kcal: 120, prot: 20, grasa: 4.5, hc: 0, fibra: 0, sal: 0.2, medida: 'g', racion: 150 },
  { nombre: 'Salmón', cat: 'Pescado', kcal: 200, prot: 20, grasa: 13, hc: 0, fibra: 0, sal: 0.15, medida: 'g', racion: 130 },

  // --- Carne ---
  { nombre: 'Pechuga de pollo', cat: 'Carne', kcal: 110, prot: 23, grasa: 2, hc: 0, fibra: 0, sal: 0.15, medida: 'g', racion: 160 },
  { nombre: 'Contramuslo de pollo sin piel', cat: 'Carne', kcal: 121, prot: 19.7, grasa: 4.2, hc: 0, fibra: 0, sal: 0.15, medida: 'g', racion: 150, nota: 'De 740 g de bandeja con hueso salen unos 500 g de carne.' },
  { nombre: 'Albóndigas de pollo', cat: 'Carne', kcal: 170, prot: 15, grasa: 10, hc: 5, fibra: 0.5, sal: 1.2, medida: 'g', racion: 225 },
  { nombre: 'Chuleta de pavo', cat: 'Carne', kcal: 120, prot: 22, grasa: 3.5, hc: 0, fibra: 0, sal: 0.15, medida: 'g', racion: 180 },
  { nombre: 'Lomo de cerdo', cat: 'Carne', kcal: 130, prot: 22, grasa: 4.5, hc: 0, fibra: 0, sal: 0.15, medida: 'g', racion: 180 },
  { nombre: 'Entrecot de ternera', cat: 'Carne', kcal: 250, prot: 20, grasa: 19, hc: 0, fibra: 0, sal: 0.15, medida: 'g', racion: 200 },
  { nombre: 'Jamón serrano en taquitos', cat: 'Carne', kcal: 240, prot: 30, grasa: 13, hc: 0.5, fibra: 0, sal: 4.5, medida: 'g', racion: 30 },

  // --- Cereales, tubérculos y legumbres ---
  { nombre: 'Pan de Pagès blanco', cat: 'Cereales', kcal: 272, prot: 9, grasa: 2.2, hc: 52, fibra: 2.5, sal: 1.2, medida: 'g', racion: 45 },
  { nombre: 'Pan 100% integral', cat: 'Cereales', kcal: 240, prot: 9, grasa: 3, hc: 40, fibra: 6.5, sal: 1.1, medida: 'g', racion: 45 },
  { nombre: 'Tostas de arroz y maíz', cat: 'Cereales', kcal: 385, prot: 8, grasa: 3, hc: 80, fibra: 2, sal: 0.4, medida: 'g', gramosUnidad: 5, racion: 15 },
  { nombre: 'Copos de avena', cat: 'Cereales', kcal: 380, prot: 13, grasa: 7, hc: 60, fibra: 10, sal: 0, medida: 'g', racion: 40 },
  { nombre: 'Arroz blanco, crudo', cat: 'Cereales', kcal: 355, prot: 7, grasa: 0.6, hc: 78, fibra: 1.4, sal: 0, medida: 'g', racion: 60 },
  { nombre: 'Pasta seca', cat: 'Cereales', kcal: 355, prot: 12, grasa: 1.5, hc: 71, fibra: 3, sal: 0, medida: 'g', racion: 60 },
  { nombre: 'Fideos de arroz, secos', cat: 'Cereales', kcal: 360, prot: 4, grasa: 0.5, hc: 82, fibra: 1.5, sal: 0, medida: 'g', racion: 70 },
  { nombre: 'Patata cocida', cat: 'Cereales', kcal: 77, prot: 2, grasa: 0.1, hc: 17, fibra: 1.8, sal: 0, medida: 'g', racion: 200 },
  { nombre: 'Boniato asado', cat: 'Cereales', kcal: 90, prot: 1.6, grasa: 0.1, hc: 20, fibra: 3, sal: 0, medida: 'g', racion: 200 },
  { nombre: 'Lentejas cocidas', cat: 'Cereales', kcal: 115, prot: 9, grasa: 0.5, hc: 17, fibra: 7, sal: 0.3, medida: 'g', racion: 150 },
  { nombre: 'Yuca cocida', cat: 'Cereales', kcal: 155, prot: 1, grasa: 0.3, hc: 38, fibra: 1.8, sal: 0, medida: 'g', racion: 150 },

  // --- Grasas y frutos secos ---
  { nombre: 'AOVE', cat: 'Grasas', kcal: 900, prot: 0, grasa: 100, hc: 0, fibra: 0, sal: 0, medida: 'g', gramosUnidad: 15, racion: 10, nota: '1 cucharada = 15 g = 135 kcal.' },
  { nombre: 'Aceite de sésamo', cat: 'Grasas', kcal: 900, prot: 0, grasa: 100, hc: 0, fibra: 0, sal: 0, medida: 'g', racion: 5 },
  { nombre: 'Aguacate', cat: 'Grasas', kcal: 160, prot: 2, grasa: 15, hc: 2, fibra: 6.5, sal: 0, medida: 'g', racion: 80, nota: 'A ojo en vez de pesado son +65 kcal al día.' },
  { nombre: 'Nueces', cat: 'Grasas', kcal: 650, prot: 15, grasa: 65, hc: 7, fibra: 6, sal: 0, medida: 'g', racion: 20 },
  { nombre: 'Aceitunas negras', cat: 'Grasas', kcal: 150, prot: 1, grasa: 15, hc: 1, fibra: 3, sal: 3, medida: 'g', racion: 25 },
  { nombre: 'Semillas de chía', cat: 'Grasas', kcal: 486, prot: 17, grasa: 31, hc: 42, fibra: 34, sal: 0, medida: 'g', racion: 12 },

  // --- Verduras y fruta ---
  { nombre: 'Berenjena', cat: 'Verdura', kcal: 25, prot: 1, grasa: 0.2, hc: 3, fibra: 3, sal: 0, medida: 'g', racion: 250 },
  { nombre: 'Pimiento', cat: 'Verdura', kcal: 30, prot: 1, grasa: 0.3, hc: 4.5, fibra: 1.8, sal: 0, medida: 'g', racion: 150 },
  { nombre: 'Cebolla', cat: 'Verdura', kcal: 40, prot: 1.1, grasa: 0.1, hc: 8, fibra: 1.7, sal: 0, medida: 'g', racion: 100 },
  { nombre: 'Tomate', cat: 'Verdura', kcal: 18, prot: 0.9, grasa: 0.2, hc: 3, fibra: 1.2, sal: 0, medida: 'g', racion: 150 },
  { nombre: 'Tomate triturado', cat: 'Verdura', kcal: 30, prot: 1.2, grasa: 0.2, hc: 5, fibra: 1.5, sal: 0.3, medida: 'g', racion: 200 },
  { nombre: 'Tomate cherry', cat: 'Verdura', kcal: 18, prot: 0.9, grasa: 0.2, hc: 3, fibra: 1.2, sal: 0, medida: 'g', racion: 100 },
  { nombre: 'Lechuga', cat: 'Verdura', kcal: 15, prot: 1.4, grasa: 0.2, hc: 1.5, fibra: 1.3, sal: 0, medida: 'g', racion: 80 },
  { nombre: 'Pepino', cat: 'Verdura', kcal: 12, prot: 0.7, grasa: 0.1, hc: 1.8, fibra: 0.7, sal: 0, medida: 'g', racion: 150 },
  { nombre: 'Pepinillos', cat: 'Verdura', kcal: 15, prot: 0.7, grasa: 0.2, hc: 2, fibra: 1.2, sal: 1.8, medida: 'g', racion: 40 },
  { nombre: 'Setas y champiñón', cat: 'Verdura', kcal: 22, prot: 3, grasa: 0.3, hc: 1, fibra: 1.5, sal: 0, medida: 'g', racion: 150 },
  { nombre: 'Col china', cat: 'Verdura', kcal: 12, prot: 1.2, grasa: 0.2, hc: 1.2, fibra: 1, sal: 0, medida: 'g', racion: 200 },
  { nombre: 'Guisantes', cat: 'Verdura', kcal: 81, prot: 5.4, grasa: 0.4, hc: 11, fibra: 5, sal: 0, medida: 'g', racion: 100 },
  { nombre: 'Espárragos trigueros', cat: 'Verdura', kcal: 20, prot: 2.2, grasa: 0.2, hc: 1.5, fibra: 2, sal: 0, medida: 'g', racion: 150 },
  { nombre: 'Zanahoria', cat: 'Verdura', kcal: 41, prot: 0.9, grasa: 0.2, hc: 8, fibra: 2.8, sal: 0.07, medida: 'g', racion: 100 },
  { nombre: 'Mango', cat: 'Fruta', kcal: 60, prot: 0.8, grasa: 0.4, hc: 15, fibra: 1.6, sal: 0, medida: 'g', racion: 150 },
  { nombre: 'Melón', cat: 'Fruta', kcal: 30, prot: 0.6, grasa: 0.2, hc: 7, fibra: 0.9, sal: 0, medida: 'g', racion: 200 },
  { nombre: 'Frutos rojos congelados', cat: 'Fruta', kcal: 45, prot: 1, grasa: 0.4, hc: 8, fibra: 3.5, sal: 0, medida: 'g', racion: 100 },
  { nombre: 'Pasas', cat: 'Fruta', kcal: 300, prot: 3, grasa: 0.5, hc: 70, fibra: 4, sal: 0, medida: 'g', racion: 16 },

  // --- Salsas y despensa ---
  { nombre: 'Salmorejo de brick', cat: 'Salsas', kcal: 85, prot: 1, grasa: 7, hc: 3.4, fibra: 2, sal: 0.9, medida: 'g', racion: 250, exacto: true, nota: 'Un vaso de 250 ml son 212 kcal.' },
  { nombre: 'Gazpacho de brick', cat: 'Salsas', kcal: 60, prot: 0.7, grasa: 4, hc: 4, fibra: 1.2, sal: 0.7, medida: 'g', racion: 250 },
  { nombre: 'Salsa de soja', cat: 'Salsas', kcal: 50, prot: 6, grasa: 0, hc: 5, fibra: 0, sal: 16, medida: 'g', racion: 15 },
  { nombre: 'Mirin', cat: 'Salsas', kcal: 230, prot: 0.3, grasa: 0, hc: 55, fibra: 0, sal: 0.5, medida: 'g', racion: 15 },
  { nombre: 'Vinagre de arroz', cat: 'Salsas', kcal: 20, prot: 0, grasa: 0, hc: 5, fibra: 0, sal: 0, medida: 'g', racion: 15 },
  { nombre: 'Mostaza de Dijon', cat: 'Salsas', kcal: 150, prot: 8, grasa: 10, hc: 4, fibra: 3, sal: 6, medida: 'g', racion: 10 },
  { nombre: 'Sirope de arce', cat: 'Salsas', kcal: 260, prot: 0, grasa: 0, hc: 67, fibra: 0, sal: 0, medida: 'g', racion: 15 },
  { nombre: 'Ketchup cero', cat: 'Salsas', kcal: 25, prot: 1, grasa: 0.1, hc: 4, fibra: 1, sal: 2.5, medida: 'g', racion: 20 },
  { nombre: 'Ligeresa', cat: 'Salsas', kcal: 250, prot: 0.5, grasa: 25, hc: 5, fibra: 0, sal: 1.5, medida: 'g', racion: 20 },
  { nombre: 'Gochujang', cat: 'Salsas', kcal: 200, prot: 5, grasa: 1, hc: 42, fibra: 3, sal: 6, medida: 'g', racion: 20 },
  { nombre: 'Miso blanco', cat: 'Salsas', kcal: 195, prot: 12, grasa: 6, hc: 24, fibra: 5, sal: 12, medida: 'g', racion: 17 },
  { nombre: 'Wakame seco', cat: 'Salsas', kcal: 300, prot: 18, grasa: 3, hc: 45, fibra: 40, sal: 15, medida: 'g', racion: 3 },
  { nombre: 'Pepitas de chocolate negro', cat: 'Salsas', kcal: 530, prot: 5, grasa: 33, hc: 48, fibra: 8, sal: 0, medida: 'g', racion: 5 },
];

// ---------------------------------------------------------------- despensa
// Lo que sueles tener en casa. `siempre` = básico que no debe faltar.
// La lista de la compra del batch cooking descuenta lo marcado como disponible.
export const DESPENSA = [
  'AOVE', 'Aceite de sésamo', 'Huevo M', 'Cottage 0% (Carrefour)', 'Leche desnatada sin lactosa',
  'Kéfir natural', 'Yogur griego ligero', 'Whey Prime en polvo', 'Atún al natural, escurrido',
  'Copos de avena', 'Semillas de chía', 'Nueces', 'Pasas', 'Tostas de arroz y maíz',
  'Arroz blanco, crudo', 'Pasta seca', 'Fideos de arroz, secos', 'Lentejas cocidas',
  'Patata cocida', 'Cebolla', 'Tomate', 'Tomate triturado', 'Lechuga', 'Zanahoria',
  'Salsa de soja', 'Mirin', 'Vinagre de arroz', 'Mostaza de Dijon', 'Sirope de arce',
  'Ketchup cero', 'Ligeresa', 'Gochujang', 'Miso blanco', 'Wakame seco',
  'Pepitas de chocolate negro', 'Aceitunas negras', 'Pepinillos', 'Frutos rojos congelados',
].map((nombre) => ({ nombre, siempre: true, disponible: true }));

// ---------------------------------------------------------------- recetario
// Los macros se calculan desde la biblioteca de arriba, así que recetas e
// ingredientes son siempre coherentes entre sí.
// cantidad: gramos, o número de unidades si el alimento tiene medida 'ud'.
export const RECETAS = [
  {
    nombre: 'Escalivada casera', raciones: 8, tiempo: 60, tags: ['batch', 'guarnición'],
    nota: 'Asada al horno. Se conserva 4 días en nevera.',
    ingredientes: [
      { nombre: 'Berenjena', cantidad: 1000 }, { nombre: 'Pimiento', cantidad: 800 },
      { nombre: 'Cebolla', cantidad: 300 }, { nombre: 'AOVE', cantidad: 30 },
    ],
  },
  {
    nombre: 'Cena de escalivada con tostas y anchoas', raciones: 1, tiempo: 5, tags: ['cena', 'rápida'],
    nota: 'La cena habitual. Falta añadirle la proteína.',
    ingredientes: [
      { nombre: 'Berenjena', cantidad: 125 }, { nombre: 'Pimiento', cantidad: 100 },
      { nombre: 'Cebolla', cantidad: 37 }, { nombre: 'AOVE', cantidad: 3.75 },
      { nombre: 'Tostas de arroz y maíz', cantidad: 15 }, { nombre: 'Anchoas en AOVE, escurridas', cantidad: 15 },
    ],
  },
  {
    nombre: 'Ensalada portuguesa casera', raciones: 2, tiempo: 20, tags: ['comida'],
    nota: 'Versión casera de la del Mercadona.',
    ingredientes: [
      { nombre: 'Patata cocida', cantidad: 300 }, { nombre: 'Huevo M', cantidad: 2 },
      { nombre: 'Atún al natural, escurrido', cantidad: 100 }, { nombre: 'Cebolla', cantidad: 60 },
      { nombre: 'Aceitunas negras', cantidad: 40 }, { nombre: 'AOVE', cantidad: 20 },
    ],
  },
  {
    nombre: 'Ensalada completa, base de patata, salsa de yogur', raciones: 2, tiempo: 25, tags: ['comida', 'plato único'],
    ingredientes: [
      { nombre: 'Patata cocida', cantidad: 400 }, { nombre: 'Lechuga', cantidad: 100 },
      { nombre: 'Huevo M', cantidad: 2 }, { nombre: 'Tomate', cantidad: 160 },
      { nombre: 'Cebolla', cantidad: 60 }, { nombre: 'Pepinillos', cantidad: 60 },
      { nombre: 'Pasas', cantidad: 16 }, { nombre: 'Atún al natural, escurrido', cantidad: 110 },
      { nombre: 'Pechuga de pollo', cantidad: 160 }, { nombre: 'Yogur griego ligero', cantidad: 100 },
      { nombre: 'Ligeresa', cantidad: 20 }, { nombre: 'Ketchup cero', cantidad: 20 },
      { nombre: 'Mostaza de Dijon', cantidad: 10 },
    ],
  },
  {
    nombre: 'Ensalada completa, base de patata, salsa de AOVE', raciones: 2, tiempo: 25, tags: ['comida', 'plato único'],
    nota: 'La misma con la otra salsa: +80 kcal por ración.',
    ingredientes: [
      { nombre: 'Patata cocida', cantidad: 400 }, { nombre: 'Lechuga', cantidad: 100 },
      { nombre: 'Huevo M', cantidad: 2 }, { nombre: 'Tomate', cantidad: 160 },
      { nombre: 'Cebolla', cantidad: 60 }, { nombre: 'Pepinillos', cantidad: 60 },
      { nombre: 'Pasas', cantidad: 16 }, { nombre: 'Atún al natural, escurrido', cantidad: 110 },
      { nombre: 'Pechuga de pollo', cantidad: 160 }, { nombre: 'Mostaza de Dijon', cantidad: 20 },
      { nombre: 'Sirope de arce', cantidad: 15 }, { nombre: 'AOVE', cantidad: 24 },
    ],
  },
  {
    nombre: 'Ensalada completa, base de lentejas, salsa de yogur', raciones: 2, tiempo: 25, tags: ['comida', 'plato único'],
    nota: 'La mejor de las tres en proteína.',
    ingredientes: [
      { nombre: 'Lentejas cocidas', cantidad: 300 }, { nombre: 'Lechuga', cantidad: 100 },
      { nombre: 'Huevo M', cantidad: 2 }, { nombre: 'Tomate', cantidad: 160 },
      { nombre: 'Cebolla', cantidad: 60 }, { nombre: 'Pepinillos', cantidad: 60 },
      { nombre: 'Pasas', cantidad: 16 }, { nombre: 'Atún al natural, escurrido', cantidad: 110 },
      { nombre: 'Pechuga de pollo', cantidad: 160 }, { nombre: 'Yogur griego ligero', cantidad: 100 },
      { nombre: 'Ligeresa', cantidad: 20 }, { nombre: 'Ketchup cero', cantidad: 20 },
      { nombre: 'Mostaza de Dijon', cantidad: 10 },
    ],
  },
  {
    nombre: 'Ensalada completa, base de pasta, salsa de yogur', raciones: 2, tiempo: 25, tags: ['comida', 'plato único'],
    ingredientes: [
      { nombre: 'Pasta seca', cantidad: 120 }, { nombre: 'Lechuga', cantidad: 100 },
      { nombre: 'Huevo M', cantidad: 2 }, { nombre: 'Tomate', cantidad: 160 },
      { nombre: 'Cebolla', cantidad: 60 }, { nombre: 'Pepinillos', cantidad: 60 },
      { nombre: 'Pasas', cantidad: 16 }, { nombre: 'Atún al natural, escurrido', cantidad: 110 },
      { nombre: 'Pechuga de pollo', cantidad: 160 }, { nombre: 'Yogur griego ligero', cantidad: 100 },
      { nombre: 'Ligeresa', cantidad: 20 }, { nombre: 'Ketchup cero', cantidad: 20 },
      { nombre: 'Mostaza de Dijon', cantidad: 10 },
    ],
  },
  {
    nombre: 'Patata en air fryer con especias', raciones: 2, tiempo: 25, tags: ['guarnición'],
    nota: 'Una cucharada de aceite para toda la bandeja.',
    ingredientes: [{ nombre: 'Patata cocida', cantidad: 400 }, { nombre: 'AOVE', cantidad: 15 }],
  },
  {
    nombre: 'Boniato en air fryer', raciones: 2, tiempo: 25, tags: ['guarnición'],
    ingredientes: [{ nombre: 'Boniato asado', cantidad: 400 }, { nombre: 'AOVE', cantidad: 15 }],
  },
  {
    nombre: 'Huevos revueltos con setas', raciones: 2, tiempo: 12, tags: ['cena', 'rápida'],
    ingredientes: [
      { nombre: 'Huevo M', cantidad: 6 }, { nombre: 'Setas y champiñón', cantidad: 200 },
      { nombre: 'AOVE', cantidad: 10 },
    ],
  },
  {
    nombre: 'Huevos revueltos con cherry, aceitunas y jamón', raciones: 2, tiempo: 12, tags: ['cena', 'rápida'],
    ingredientes: [
      { nombre: 'Huevo M', cantidad: 6 }, { nombre: 'Tomate cherry', cantidad: 160 },
      { nombre: 'Aceitunas negras', cantidad: 50 }, { nombre: 'Jamón serrano en taquitos', cantidad: 60 },
      { nombre: 'AOVE', cantidad: 10 },
    ],
  },
  {
    nombre: 'Albóndigas de pollo a la cazuela con huevos', raciones: 2, tiempo: 40, tags: ['comida'],
    nota: 'Bandeja de 16 albóndigas y 4 huevos.',
    ingredientes: [
      { nombre: 'Albóndigas de pollo', cantidad: 450 }, { nombre: 'Tomate triturado', cantidad: 780 },
      { nombre: 'Huevo M', cantidad: 4 }, { nombre: 'Pimiento', cantidad: 120 },
      { nombre: 'Cebolla', cantidad: 100 }, { nombre: 'AOVE', cantidad: 15 },
    ],
  },
  {
    nombre: 'Merluza en salsa verde con guisantes', raciones: 2, tiempo: 30, tags: ['cena'],
    ingredientes: [
      { nombre: 'Merluza', cantidad: 400 }, { nombre: 'Guisantes', cantidad: 160 },
      { nombre: 'Cebolla', cantidad: 100 }, { nombre: 'AOVE', cantidad: 20 },
    ],
  },
  {
    nombre: 'Pollo marinado con arroz, estilo asiático', raciones: 2, tiempo: 35, tags: ['comida', 'batch'],
    ingredientes: [
      { nombre: 'Pechuga de pollo', cantidad: 360 }, { nombre: 'Arroz blanco, crudo', cantidad: 120 },
      { nombre: 'AOVE', cantidad: 15 }, { nombre: 'Salsa de soja', cantidad: 20 },
    ],
  },
  {
    nombre: 'Fideos de arroz con pollo y gochujang', raciones: 2, tiempo: 30, tags: ['comida'],
    ingredientes: [
      { nombre: 'Fideos de arroz, secos', cantidad: 140 }, { nombre: 'Pechuga de pollo', cantidad: 300 },
      { nombre: 'Pimiento', cantidad: 150 }, { nombre: 'Cebolla', cantidad: 100 },
      { nombre: 'Gochujang', cantidad: 40 }, { nombre: 'Salsa de soja', cantidad: 20 },
      { nombre: 'Aceite de sésamo', cantidad: 10 },
    ],
  },
  {
    nombre: 'Espárragos trigueros a la plancha', raciones: 2, tiempo: 12, tags: ['guarnición', 'rápida'],
    ingredientes: [{ nombre: 'Espárragos trigueros', cantidad: 300 }, { nombre: 'AOVE', cantidad: 10 }],
  },
  {
    nombre: 'Lomo de cerdo marinado a la plancha', raciones: 2, tiempo: 20, tags: ['comida', 'cena'],
    nota: 'Marinado con pimentón.',
    ingredientes: [{ nombre: 'Lomo de cerdo', cantidad: 360 }, { nombre: 'AOVE', cantidad: 10 }],
  },
  {
    nombre: 'Chuleta de pavo a la plancha', raciones: 2, tiempo: 15, tags: ['comida', 'cena', 'rápida'],
    ingredientes: [{ nombre: 'Chuleta de pavo', cantidad: 360 }, { nombre: 'AOVE', cantidad: 10 }],
  },
  {
    nombre: 'Entrecot de ternera a la plancha', raciones: 2, tiempo: 15, tags: ['cena'],
    nota: '1-2 veces por semana.',
    ingredientes: [{ nombre: 'Entrecot de ternera', cantidad: 400 }, { nombre: 'AOVE', cantidad: 10 }],
  },
  {
    nombre: 'Jurel al horno con refrito de ajo', raciones: 2, tiempo: 30, tags: ['cena'],
    nota: 'El refrito son 2 cucharadas de AOVE y se consume entero.',
    ingredientes: [{ nombre: 'Jurel', cantidad: 300 }, { nombre: 'AOVE', cantidad: 22 }],
  },
  {
    nombre: 'Sopa de pollo con col china y miso', raciones: 5, tiempo: 45, tags: ['batch', 'cena'],
    nota: 'Contramuslos con hueso: de 740 g de bandeja salen unos 500 g de carne.',
    ingredientes: [
      { nombre: 'Contramuslo de pollo sin piel', cantidad: 500 }, { nombre: 'AOVE', cantidad: 34 },
      { nombre: 'Cebolla', cantidad: 200 }, { nombre: 'Zanahoria', cantidad: 120 },
      { nombre: 'Salsa de soja', cantidad: 30 }, { nombre: 'Mirin', cantidad: 18 },
      { nombre: 'Setas y champiñón', cantidad: 130 }, { nombre: 'Col china', cantidad: 450 },
      { nombre: 'Pasta seca', cantidad: 160 }, { nombre: 'Miso blanco', cantidad: 34 },
      { nombre: 'Wakame seco', cantidad: 3 }, { nombre: 'Aceite de sésamo', cantidad: 7 },
    ],
  },
  {
    nombre: 'Pepino marinado', raciones: 4, tiempo: 10, tags: ['batch', 'guarnición'],
    nota: 'El marinado se queda en el tarro; solo cuenta lo que arrastra.',
    ingredientes: [
      { nombre: 'Pepino', cantidad: 400 }, { nombre: 'Salsa de soja', cantidad: 20 },
      { nombre: 'Vinagre de arroz', cantidad: 20 }, { nombre: 'Aceite de sésamo', cantidad: 5 },
      { nombre: 'AOVE', cantidad: 5 },
    ],
  },
  {
    nombre: 'Bol de kéfir de media mañana', raciones: 1, tiempo: 5, tags: ['media-manana', 'rápida'],
    ingredientes: [
      { nombre: 'Kéfir natural', cantidad: 250 }, { nombre: 'Semillas de chía', cantidad: 12 },
      { nombre: 'Frutos rojos congelados', cantidad: 100 }, { nombre: 'Copos de avena', cantidad: 20 },
      { nombre: 'Pepitas de chocolate negro', cantidad: 5 },
    ],
  },
  {
    nombre: 'Tostada de desayuno', raciones: 1, tiempo: 5, tags: ['desayuno', 'rápida'],
    ingredientes: [
      { nombre: 'Pan de Pagès blanco', cantidad: 45 }, { nombre: 'Cottage 0% (Carrefour)', cantidad: 120 },
      { nombre: 'Atún al natural, escurrido', cantidad: 55 }, { nombre: 'AOVE', cantidad: 2 },
      { nombre: 'Tomate', cantidad: 40 },
    ],
  },
  {
    nombre: 'Batido de proteína', raciones: 1, tiempo: 2, tags: ['merienda', 'rápida'],
    nota: '2 scoops son 25 g de producto, no 50.',
    ingredientes: [
      { nombre: 'Whey Prime en polvo', cantidad: 25 }, { nombre: 'Leche desnatada sin lactosa', cantidad: 200 },
    ],
  },
];

// ---------------------------------------------------------------- referencias
// Dónde se escapan las calorías. Texto fijo, para consultar en Cocina.
export const ESCAPES = [
  { cosa: '1 cucharada de AOVE (15 g)', coste: '135 kcal' },
  { cosa: 'Refrito de ajo, 2 cucharadas', coste: '200 kcal, y no queda nada en la sartén' },
  { cosa: 'Salsa de AOVE en la ensalada, frente a la de yogur', coste: '+80 kcal por ración' },
  { cosa: 'Un vaso de salmorejo de 250 ml', coste: '212 kcal' },
  { cosa: '100 g de boniato frente a 100 g de patata', coste: '+13 kcal' },
  { cosa: 'Aguacate a ojo en vez de pesado', coste: '+65 kcal al día' },
];
