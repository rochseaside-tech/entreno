// catalogo-ejercicios.js — los ejercicios que merecen la pena, y solo esos.
// Criterio: que trabajen bien el músculo, que se aprendan en una sesión y que
// haya máquina o material en cualquier gimnasio. Nada de variantes raras.
//
// en:      nombre en free-exercise-db (dominio público). De ahí salen las dos
//          fotos, inicio y final, en img/ej/<id>-0.webp y <id>-1.webp.
// rep:     rango de repeticiones por defecto. descanso en segundos.
// tipo:    'peso' = carga en kg | 'corporal' = peso corporal, la carga es lastre
// aviso:   se enseña en rojo suave. Para la rodilla (menisco) y el hombro izquierdo.

export const GRUPOS = ['Pecho', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Femoral', 'Glúteo', 'Gemelo', 'Abdomen'];

const RODILLA = 'Rodilla: baja solo hasta 90° y para si notas el menisco.';
const HOMBRO = 'Hombro izquierdo: recorrido corto y peso ligero; para si molesta.';

export const CATALOGO = [
  // ============================================================ Pecho
  {
    id: 'press-pecho-maquina', nombre: 'Press de pecho en máquina', grupo: 'Pecho', sec: ['Tríceps', 'Hombro'], equipo: 'Máquina',
    en: 'Leverage Chest Press', rep: [10, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Asiento de forma que las asas queden a la altura media del pecho, no del cuello.',
      'Omóplatos juntos y apoyados en el respaldo todo el movimiento.',
      'Empuja sin bloquear el codo y sin adelantar el hombro al final.',
      'Vuelve solo hasta que la mano quede en la línea del pecho, no más atrás.',
    ],
  },
  {
    id: 'press-inclinado-maquina', nombre: 'Press inclinado en máquina', grupo: 'Pecho', sec: ['Hombro', 'Tríceps'], equipo: 'Máquina',
    en: 'Leverage Incline Chest Press', rep: [8, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Asas a la altura de la parte alta del pecho.',
      'Omóplatos juntos y pegados al respaldo.',
      'Empuja hacia arriba y un poco hacia dentro, sin bloquear el codo.',
    ],
  },
  {
    id: 'press-banca-mancuernas', nombre: 'Press de banca con mancuernas', grupo: 'Pecho', sec: ['Tríceps', 'Hombro'], equipo: 'Mancuernas',
    en: 'Dumbbell Bench Press', rep: [8, 12], rir: '2', descanso: 120, incremento: 2, tipo: 'peso',
    claves: [
      'Apoya las mancuernas en los muslos y túmbate con ellas: así llegan a su sitio sin forzar el hombro.',
      'Codos a unos 45° del cuerpo, no abiertos en cruz.',
      'Baja hasta que la mancuerna quede a la altura del pecho y empuja juntándolas un poco arriba.',
    ],
  },
  {
    id: 'press-inclinado-mancuernas', nombre: 'Press inclinado con mancuernas', grupo: 'Pecho', sec: ['Hombro', 'Tríceps'], equipo: 'Mancuernas',
    en: 'Incline Dumbbell Press', rep: [8, 12], rir: '2', descanso: 120, incremento: 2, tipo: 'peso',
    claves: [
      'Banco a 30°: más inclinado ya trabaja sobre todo el hombro.',
      'Codos a 45°, antebrazos verticales.',
      'Baja controlado hasta la parte alta del pecho y empuja sin chocar las mancuernas.',
    ],
  },
  {
    id: 'press-banca-barra', nombre: 'Press de banca con barra', grupo: 'Pecho', sec: ['Tríceps', 'Hombro'], equipo: 'Barra',
    en: 'Barbell Bench Press - Medium Grip', rep: [6, 10], rir: '2', descanso: 150, incremento: 2.5, tipo: 'peso',
    claves: [
      'Ojos debajo de la barra, omóplatos juntos y hacia abajo, pies firmes en el suelo.',
      'Agarre algo más ancho que los hombros.',
      'Baja la barra a la parte baja del pecho y empuja en línea recta hacia arriba.',
      'Usa los topes de seguridad o pide que te ayuden si vas cerca del fallo.',
    ],
  },
  {
    id: 'contractor', nombre: 'Aperturas en máquina (contractor)', grupo: 'Pecho', sec: ['Hombro'], equipo: 'Máquina',
    en: 'Butterfly', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Asiento de forma que las asas queden a la altura del pecho.',
      'Codos ligeramente doblados y fijos: el movimiento es de abrazar.',
      'Abre solo hasta la línea del cuerpo, no más atrás.',
    ],
  },
  {
    id: 'cruce-poleas', nombre: 'Cruce de poleas', grupo: 'Pecho', sec: ['Hombro'], equipo: 'Polea',
    en: 'Cable Crossover', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Un pie adelantado y el tronco un poco inclinado hacia delante.',
      'Junta las manos delante del pecho con los codos casi estirados y fijos.',
      'Vuelve despacio hasta notar el pecho estirado.',
    ],
  },
  {
    id: 'flexiones', nombre: 'Flexiones', grupo: 'Pecho', sec: ['Tríceps', 'Hombro'], equipo: 'Peso corporal',
    en: 'Pushups', rep: [8, 15], rir: '1-2', descanso: 90, incremento: 0, tipo: 'corporal',
    claves: [
      'Cuerpo en línea recta de cabeza a talones: glúteo apretado.',
      'Manos algo más anchas que los hombros, codos a 45°.',
      'Si no llegas a 8, apoya las manos en un banco o las rodillas en el suelo.',
    ],
  },

  // ============================================================ Espalda
  {
    id: 'jalon-prono', nombre: 'Jalón al pecho, agarre prono', grupo: 'Espalda', sec: ['Bíceps', 'Hombro posterior'], equipo: 'Polea',
    en: 'Wide-Grip Lat Pulldown', rep: [8, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Manos algo más anchas que los hombros, agarre prono.',
      'Pecho alto: la barra baja a la clavícula, nunca a la nuca.',
      'Piensa en bajar los codos hacia el suelo, no en tirar con las manos.',
      'Sube controlado y deja que el omóplato se estire arriba, sin encoger el hombro.',
    ],
  },
  {
    id: 'jalon-neutro', nombre: 'Jalón agarre neutro', grupo: 'Espalda', sec: ['Bíceps'], equipo: 'Polea',
    en: 'V-Bar Pulldown', rep: [10, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Agarre neutro (palmas enfrentadas), manos a la anchura de los hombros.',
      'Pecho arriba y ligera inclinación atrás, que se mantiene quieta.',
      'Lleva los codos hacia las caderas; el agarre baja a la parte alta del pecho.',
      'Sube en 2 segundos hasta estirar del todo.',
    ],
  },
  {
    id: 'jalon-supino', nombre: 'Jalón agarre supino', grupo: 'Espalda', sec: ['Bíceps'], equipo: 'Polea',
    en: 'Underhand Cable Pulldowns', rep: [8, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Palmas mirando hacia ti, manos a la anchura de los hombros.',
      'Baja la barra a la parte alta del pecho llevando los codos junto al cuerpo.',
      'Sube despacio hasta estirar los brazos.',
    ],
  },
  {
    id: 'remo-sentado', nombre: 'Remo sentado', grupo: 'Espalda', sec: ['Bíceps', 'Hombro posterior'], equipo: 'Polea',
    en: 'Seated Cable Rows', rep: [8, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Pecho alto y espalda neutra: el tronco casi no se mueve.',
      'Codos pegados al cuerpo hasta pasar la línea del torso.',
      'Junta los omóplatos al final y aguanta medio segundo.',
      'Estira los brazos del todo al soltar, sin redondear la espalda.',
    ],
  },
  {
    id: 'remo-maquina', nombre: 'Remo en máquina', grupo: 'Espalda', sec: ['Bíceps', 'Hombro posterior'], equipo: 'Máquina',
    en: 'Leverage Iso Row', rep: [8, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Pecho apoyado en el cojín todo el rato.',
      'Tira llevando los codos hacia atrás y junta los omóplatos.',
      'Vuelve hasta estirar los brazos sin despegar el pecho.',
    ],
  },
  {
    id: 'remo-mancuerna', nombre: 'Remo con mancuerna a una mano', grupo: 'Espalda', sec: ['Bíceps'], equipo: 'Mancuernas',
    en: 'One-Arm Dumbbell Row', rep: [8, 12], rir: '2', descanso: 90, incremento: 2, tipo: 'peso',
    claves: [
      'Rodilla y mano del mismo lado apoyadas en el banco, espalda plana.',
      'Lleva el codo hacia la cadera, no hacia el techo.',
      'Baja hasta estirar el brazo sin girar el tronco.',
    ],
  },
  {
    id: 'remo-inclinado-mancuernas', nombre: 'Remo con mancuernas en banco inclinado', grupo: 'Espalda', sec: ['Hombro posterior', 'Bíceps'], equipo: 'Mancuernas',
    en: 'Dumbbell Incline Row', rep: [10, 12], rir: '2', descanso: 90, incremento: 2, tipo: 'peso',
    claves: [
      'Pecho apoyado en un banco a 30-45°: la lumbar descansa.',
      'Tira de las dos mancuernas llevando los codos atrás.',
      'Aguanta medio segundo arriba juntando los omóplatos.',
    ],
  },
  {
    id: 'remo-barra', nombre: 'Remo con barra', grupo: 'Espalda', sec: ['Bíceps', 'Lumbar'], equipo: 'Barra',
    en: 'Bent Over Barbell Row', rep: [6, 10], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Rodillas algo dobladas y tronco inclinado unos 45°, espalda recta.',
      'Tira de la barra hacia el ombligo.',
      'Si la espalda se redondea o te balanceas, baja el peso.',
    ],
  },
  {
    id: 'pullover-polea', nombre: 'Pullover en polea', grupo: 'Espalda', sec: [], equipo: 'Polea',
    en: 'Straight-Arm Pulldown', rep: [12, 15], rir: '1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'De pie frente a la polea alta, brazos casi estirados.',
      'Baja la barra en arco hasta los muslos, sin doblar los codos.',
      'Sube despacio hasta la altura de la cabeza.',
    ],
  },
  {
    id: 'dominadas', nombre: 'Dominadas', grupo: 'Espalda', sec: ['Bíceps'], equipo: 'Peso corporal',
    en: 'Pullups', rep: [5, 10], rir: '1-2', descanso: 150, incremento: 2.5, tipo: 'corporal',
    claves: [
      'Si aún no te salen, usa la máquina de dominadas asistidas: es el mismo ejercicio.',
      'Empieza colgada con los brazos estirados y el pecho alto.',
      'Sube hasta pasar la barbilla por encima de la barra, sin balancearte.',
    ],
  },

  // ============================================================ Hombro
  {
    id: 'press-hombro-maquina', nombre: 'Press hombro en máquina', grupo: 'Hombro', sec: ['Tríceps'], equipo: 'Máquina',
    en: 'Machine Shoulder (Military) Press', rep: [8, 12], rir: '2', descanso: 90, incremento: 2.5, tipo: 'peso',
    claves: [
      'Asiento a la altura de que las asas queden a la altura del hombro, no más arriba.',
      'Espalda apoyada y costillas abajo, sin arquear la lumbar.',
      'Sube sin bloquear el codo de golpe.',
      'Baja solo hasta que el codo quede un poco por debajo del hombro y para ahí (hombro izquierdo).',
    ],
  },
  {
    id: 'press-hombro-mancuernas', nombre: 'Press de hombro con mancuernas, sentada', grupo: 'Hombro', sec: ['Tríceps'], equipo: 'Mancuernas',
    en: 'Seated Dumbbell Press', rep: [8, 12], rir: '2', descanso: 90, incremento: 2, tipo: 'peso',
    claves: [
      'Respaldo casi vertical y espalda apoyada.',
      'Mancuernas a la altura de las orejas, codos un poco por delante del cuerpo.',
      'Empuja hacia arriba sin chocarlas.',
    ],
    aviso: HOMBRO,
  },
  {
    id: 'elev-laterales', nombre: 'Elevaciones laterales, mancuernas a dos manos', grupo: 'Hombro', sec: [], equipo: 'Mancuernas',
    en: 'Side Lateral Raise', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 1, tipo: 'peso',
    claves: [
      'Pulgar ligeramente hacia arriba, nunca el meñique alto.',
      'Para a la altura del hombro y no subas más.',
      'Codo semiflexionado y fijo: sube el codo, no la mano.',
      'Mancuernas a dos manos, no polea a un brazo (te molesta el hombro izquierdo).',
    ],
  },
  {
    id: 'elev-laterales-polea', nombre: 'Elevaciones laterales en polea', grupo: 'Hombro', sec: [], equipo: 'Polea',
    en: 'Cable Seated Lateral Raise', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 1.25, tipo: 'peso',
    claves: [
      'Polea baja, sube el brazo hacia el lado hasta la altura del hombro.',
      'Codo algo doblado y fijo.',
      'Baja despacio: la polea mantiene la tensión abajo.',
    ],
    aviso: 'A un brazo en polea te molesta el hombro izquierdo. Mejor con mancuernas a dos manos.',
  },
  {
    id: 'deltoides-posterior', nombre: 'Deltoides posterior en máquina (pájaros)', grupo: 'Hombro', sec: ['Espalda'], equipo: 'Máquina',
    en: 'Reverse Machine Flyes', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Pecho apoyado y hombros bajos, lejos de las orejas.',
      'Abre con los codos, no con las manos.',
      'Para cuando los brazos lleguen a la línea del cuerpo.',
      'Peso bajo y repeticiones limpias: aquí el balanceo no aporta nada.',
    ],
  },
  {
    id: 'face-pull', nombre: 'Face pull', grupo: 'Hombro', sec: ['Espalda'], equipo: 'Polea',
    en: 'Face Pull', rep: [12, 15], rir: '1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Polea a la altura de la cara, con cuerda.',
      'Tira hacia la frente separando las manos, codos altos.',
      'Aguanta un segundo con los omóplatos juntos. Es muy bueno para la salud del hombro.',
    ],
  },
  {
    id: 'pajaros-mancuernas', nombre: 'Pájaros con mancuernas', grupo: 'Hombro', sec: ['Espalda'], equipo: 'Mancuernas',
    en: 'Seated Bent-Over Rear Delt Raise', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 1, tipo: 'peso',
    claves: [
      'Sentada al borde del banco, pecho sobre los muslos.',
      'Abre los brazos hacia los lados con los codos algo doblados.',
      'Sube hasta la línea del cuerpo, sin encoger los hombros.',
    ],
  },
  {
    id: 'elev-frontales', nombre: 'Elevaciones frontales', grupo: 'Hombro', sec: [], equipo: 'Mancuernas',
    en: 'Front Dumbbell Raise', rep: [10, 15], rir: '1', descanso: 60, incremento: 1, tipo: 'peso',
    claves: [
      'Sube la mancuerna por delante hasta la altura del hombro.',
      'Sin balancear el cuerpo para ayudarte.',
      'Baja en 2 segundos.',
    ],
    aviso: HOMBRO,
  },

  // ============================================================ Bíceps
  {
    id: 'curl-biceps-maquina', nombre: 'Curl bíceps en máquina', grupo: 'Bíceps', sec: [], equipo: 'Máquina',
    en: 'Machine Bicep Curl', rep: [10, 12], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Codo alineado con el eje de la máquina y pegado a la almohadilla.',
      'Sube sin despegar el codo ni echar el cuerpo atrás.',
      'Baja en 2-3 segundos hasta casi estirar del todo.',
      'Muñeca neutra, ni doblada hacia atrás.',
    ],
  },
  {
    id: 'curl-mancuernas', nombre: 'Curl con mancuernas', grupo: 'Bíceps', sec: [], equipo: 'Mancuernas',
    en: 'Dumbbell Bicep Curl', rep: [10, 12], rir: '0-1', descanso: 60, incremento: 1, tipo: 'peso',
    claves: [
      'Codos pegados al costado y quietos.',
      'Gira la palma hacia arriba mientras subes.',
      'Baja del todo y despacio, sin balanceo.',
    ],
  },
  {
    id: 'curl-martillo', nombre: 'Curl martillo', grupo: 'Bíceps', sec: ['Antebrazo'], equipo: 'Mancuernas',
    en: 'Hammer Curls', rep: [10, 12], rir: '0-1', descanso: 60, incremento: 1, tipo: 'peso',
    claves: [
      'Palmas enfrentadas todo el movimiento, como sujetando un martillo.',
      'Codos quietos junto al cuerpo.',
      'Sube hasta el hombro y baja controlado.',
    ],
  },
  {
    id: 'curl-barra-z', nombre: 'Curl con barra Z', grupo: 'Bíceps', sec: [], equipo: 'Barra Z',
    en: 'EZ-Bar Curl', rep: [8, 12], rir: '1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Coge la barra por la parte inclinada: la muñeca va más cómoda que con barra recta.',
      'Codos pegados, sin echar la cadera adelante.',
      'Baja hasta estirar casi del todo.',
    ],
  },
  {
    id: 'curl-polea', nombre: 'Curl en polea', grupo: 'Bíceps', sec: [], equipo: 'Polea',
    en: 'Standing Biceps Cable Curl', rep: [10, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Polea baja con barra, de pie y un paso atrás.',
      'Codos fijos al costado.',
      'La polea mantiene la tensión: baja despacio.',
    ],
  },
  {
    id: 'curl-predicador', nombre: 'Curl predicador en máquina', grupo: 'Bíceps', sec: [], equipo: 'Máquina',
    en: 'Machine Preacher Curls', rep: [10, 12], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Axilas pegadas al borde del cojín.',
      'Sube sin despegar los codos.',
      'Baja casi hasta estirar, sin soltar el peso de golpe abajo.',
    ],
  },
  {
    id: 'curl-inclinado', nombre: 'Curl inclinado con mancuernas', grupo: 'Bíceps', sec: [], equipo: 'Mancuernas',
    en: 'Incline Dumbbell Curl', rep: [10, 12], rir: '1', descanso: 60, incremento: 1, tipo: 'peso',
    claves: [
      'Banco a 45-60°, brazos colgando por detrás del cuerpo.',
      'Sube sin adelantar los codos.',
      'Estira bien abajo: es donde más trabaja.',
    ],
  },

  // ============================================================ Tríceps
  {
    id: 'triceps-polea', nombre: 'Extensión de tríceps en polea', grupo: 'Tríceps', sec: [], equipo: 'Polea',
    en: 'Triceps Pushdown', rep: [10, 12], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Codos pegados al costado y fijos: solo se mueve el antebrazo.',
      'Tronco casi vertical, con una ligera inclinación adelante.',
      'Estira del todo abajo y aprieta un segundo.',
      'Sube controlada hasta que el antebrazo pase la horizontal.',
    ],
  },
  {
    id: 'triceps-cuerda', nombre: 'Extensión de tríceps con cuerda', grupo: 'Tríceps', sec: [], equipo: 'Polea',
    en: 'Triceps Pushdown - Rope Attachment', rep: [10, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Codos pegados y quietos.',
      'Abajo, separa las manos y aprieta un segundo.',
      'Sube despacio hasta que el antebrazo pase la horizontal.',
    ],
  },
  {
    id: 'triceps-sobre-cabeza', nombre: 'Extensión de tríceps sobre la cabeza en polea', grupo: 'Tríceps', sec: [], equipo: 'Polea',
    en: 'Cable Rope Overhead Triceps Extension', rep: [10, 12], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Codos al frente y pegados a la cabeza: no se abren.',
      'Solo se mueve el antebrazo, el codo se queda quieto.',
      'Da un paso adelante de la polea para que la tracción venga de detrás.',
      'Estira del todo arriba sin bloquear de golpe.',
    ],
  },
  {
    id: 'triceps-mancuerna-cabeza', nombre: 'Extensión de tríceps con mancuerna sobre la cabeza', grupo: 'Tríceps', sec: [], equipo: 'Mancuernas',
    en: 'Standing Dumbbell Triceps Extension', rep: [10, 12], rir: '1', descanso: 60, incremento: 2, tipo: 'peso',
    claves: [
      'Sujeta una mancuerna con las dos manos por detrás de la cabeza.',
      'Codos apuntando al techo y quietos.',
      'Estira los brazos del todo y baja despacio.',
    ],
    aviso: HOMBRO,
  },
  {
    id: 'press-frances', nombre: 'Press francés con barra Z', grupo: 'Tríceps', sec: [], equipo: 'Barra Z',
    en: 'EZ-Bar Skullcrusher', rep: [8, 12], rir: '1', descanso: 90, incremento: 2.5, tipo: 'peso',
    claves: [
      'Tumbada, brazos verticales y codos apuntando al techo.',
      'Baja la barra hacia la frente doblando solo el codo.',
      'Estira sin abrir los codos.',
    ],
  },
  {
    id: 'fondos-maquina', nombre: 'Fondos en máquina', grupo: 'Tríceps', sec: ['Pecho'], equipo: 'Máquina',
    en: 'Dip Machine', rep: [8, 12], rir: '1-2', descanso: 90, incremento: 2.5, tipo: 'peso',
    claves: [
      'Espalda apoyada y codos hacia atrás, pegados al cuerpo.',
      'Empuja hasta estirar los brazos.',
      'Sube solo hasta que el codo llegue a 90°.',
    ],
    aviso: HOMBRO,
  },
  {
    id: 'patada-triceps', nombre: 'Patada de tríceps', grupo: 'Tríceps', sec: [], equipo: 'Mancuernas',
    en: 'Tricep Dumbbell Kickback', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 1, tipo: 'peso',
    claves: [
      'Tronco inclinado y brazo pegado al costado, en paralelo al suelo.',
      'Estira el codo hasta que el brazo quede recto y aguanta un segundo.',
      'Solo se mueve el antebrazo.',
    ],
  },

  // ============================================================ Cuádriceps
  {
    id: 'prensa', nombre: 'Prensa, recorrido hasta 90°', grupo: 'Cuádriceps', sec: ['Glúteo', 'Femoral'], equipo: 'Máquina',
    en: 'Leg Press', rep: [10, 12], rir: '2', descanso: 120, incremento: 5, tipo: 'peso',
    claves: [
      'Baja solo hasta 90° de flexión de rodilla, ni un grado más, por el menisco.',
      'Si los talones se despegan de la plataforma, has bajado demasiado.',
      'Pies a la anchura de la cadera y algo altos en la plataforma: quita recorrido a la rodilla.',
      'Empuja con mediopié y talón, y no bloquees la rodilla arriba.',
    ],
  },
  {
    id: 'extension-cuadriceps', nombre: 'Extensión de cuádriceps', grupo: 'Cuádriceps', sec: [], equipo: 'Máquina',
    en: 'Leg Extensions', rep: [12, 15], rir: '0-1', descanso: 90, incremento: 2.5, tipo: 'peso',
    claves: [
      'Arranca desde 90°, sin dejar caer la pierna más atrás entre repeticiones.',
      'Ajusta el respaldo para que la rodilla coincida con el eje de giro.',
      'Sube hasta estirar y aguanta un segundo arriba.',
      'Baja controlada y frena en los 90°: ahí termina la repetición.',
    ],
  },
  {
    id: 'hack-squat', nombre: 'Sentadilla hack en máquina', grupo: 'Cuádriceps', sec: ['Glúteo'], equipo: 'Máquina',
    en: 'Hack Squat', rep: [8, 12], rir: '2', descanso: 120, incremento: 5, tipo: 'peso',
    claves: [
      'Espalda pegada al respaldo, pies a la anchura de la cadera.',
      'Baja controlada y sube empujando con todo el pie.',
      'No bloquees la rodilla arriba.',
    ],
    aviso: RODILLA,
  },
  {
    id: 'sentadilla-multipower', nombre: 'Sentadilla en multipower', grupo: 'Cuádriceps', sec: ['Glúteo'], equipo: 'Multipower',
    en: 'Smith Machine Squat', rep: [8, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Barra apoyada en la parte alta de la espalda, pies un poco por delante de la barra.',
      'Baja como si te sentaras, con la espalda recta.',
      'La guía fija de la máquina te da estabilidad: buena opción para aprender.',
    ],
    aviso: RODILLA,
  },
  {
    id: 'sentadilla-barra', nombre: 'Sentadilla con barra', grupo: 'Cuádriceps', sec: ['Glúteo', 'Lumbar'], equipo: 'Barra',
    en: 'Barbell Squat', rep: [6, 10], rir: '2', descanso: 150, incremento: 2.5, tipo: 'peso',
    claves: [
      'Barra sobre la parte alta de la espalda, pies a la anchura de los hombros.',
      'Rodillas en la dirección de las puntas de los pies.',
      'Baja con el pecho alto y sube empujando el suelo.',
      'Hazla en jaula con los topes puestos.',
    ],
    aviso: RODILLA,
  },
  {
    id: 'sentadilla-mancuerna', nombre: 'Sentadilla con mancuerna (goblet)', grupo: 'Cuádriceps', sec: ['Glúteo'], equipo: 'Mancuernas',
    en: 'Dumbbell Squat', rep: [10, 15], rir: '2', descanso: 90, incremento: 2, tipo: 'peso',
    claves: [
      'Sujeta la mancuerna pegada al pecho.',
      'Baja con la espalda recta y los codos por dentro de las rodillas.',
      'Sube empujando con los talones.',
    ],
    aviso: RODILLA,
  },
  {
    id: 'zancadas', nombre: 'Zancadas con mancuernas', grupo: 'Cuádriceps', sec: ['Glúteo'], equipo: 'Mancuernas',
    en: 'Dumbbell Lunges', rep: [10, 12], rir: '2', descanso: 90, incremento: 2, tipo: 'peso',
    claves: [
      'Paso largo adelante y baja la rodilla de atrás hacia el suelo.',
      'El tronco se queda recto.',
      'Empuja con el talón de delante para volver.',
    ],
    aviso: RODILLA,
  },
  {
    id: 'bulgara', nombre: 'Sentadilla búlgara', grupo: 'Cuádriceps', sec: ['Glúteo'], equipo: 'Mancuernas',
    en: 'Split Squat with Dumbbells', rep: [8, 12], rir: '2', descanso: 90, incremento: 2, tipo: 'peso',
    claves: [
      'Pie de atrás sobre un banco, el de delante un paso largo por delante.',
      'Baja en vertical hasta que el muslo de delante quede casi paralelo al suelo.',
      'Inclinar el tronco un poco lleva el trabajo al glúteo.',
    ],
    aviso: RODILLA,
  },

  // ============================================================ Femoral
  {
    id: 'curl-femoral-sentado', nombre: 'Curl femoral sentado', grupo: 'Femoral', sec: [], equipo: 'Máquina',
    en: 'Seated Leg Curl', rep: [10, 12], rir: '0-1', descanso: 90, incremento: 2.5, tipo: 'peso',
    claves: [
      'Rodilla alineada con el eje de giro de la máquina.',
      'Almohadilla justo por encima del tobillo, no sobre el gemelo.',
      'Baja los talones con fuerza y vuelve lento, 2-3 segundos.',
      'Glúteo pegado al asiento: si se despega, baja el peso.',
    ],
  },
  {
    id: 'curl-femoral-tumbado', nombre: 'Curl femoral tumbado', grupo: 'Femoral', sec: [], equipo: 'Máquina',
    en: 'Lying Leg Curls', rep: [10, 12], rir: '0-1', descanso: 90, incremento: 2.5, tipo: 'peso',
    claves: [
      'Cadera pegada al banco; si se despega, baja el peso.',
      'Almohadilla justo por encima del tobillo.',
      'Sube hasta el final y baja en 2-3 segundos.',
      'Punta del pie hacia la espinilla para que no se meta el gemelo.',
    ],
  },
  {
    id: 'peso-muerto-rumano', nombre: 'Peso muerto rumano con barra', grupo: 'Femoral', sec: ['Glúteo', 'Lumbar'], equipo: 'Barra',
    en: 'Romanian Deadlift', rep: [8, 12], rir: '2', descanso: 120, incremento: 2.5, tipo: 'peso',
    claves: [
      'Rodillas algo dobladas y fijas; el movimiento es echar la cadera atrás.',
      'La barra baja rozando los muslos, espalda recta.',
      'Baja hasta notar el femoral estirado (más o menos la rodilla) y sube apretando el glúteo.',
    ],
  },
  {
    id: 'peso-muerto-rumano-mancuernas', nombre: 'Peso muerto rumano con mancuernas', grupo: 'Femoral', sec: ['Glúteo'], equipo: 'Mancuernas',
    en: 'Stiff-Legged Dumbbell Deadlift', rep: [10, 12], rir: '2', descanso: 90, incremento: 2, tipo: 'peso',
    claves: [
      'Mancuernas delante de los muslos, rodillas algo dobladas.',
      'Echa la cadera atrás con la espalda recta.',
      'Sube apretando el glúteo, sin echarte hacia atrás arriba.',
    ],
  },

  // ============================================================ Glúteo
  {
    id: 'hip-thrust', nombre: 'Hip thrust en máquina', grupo: 'Glúteo', sec: ['Femoral'], equipo: 'Máquina',
    en: 'Barbell Hip Thrust', rep: [10, 12], rir: '1-2', descanso: 120, incremento: 5, tipo: 'peso',
    fotoNota: 'La foto es del hip thrust con barra: el movimiento es el mismo, cambia el aparato.',
    claves: [
      'El borde del respaldo justo debajo del omóplato.',
      'Barbilla metida y costillas abajo: el movimiento es de cadera, la lumbar no se arquea.',
      'Sube empujando con los talones hasta alinear hombro, cadera y rodilla, y aprieta un segundo.',
      'Espinilla vertical arriba: si los pies quedan muy cerca, trabaja el cuádriceps y molesta la rodilla.',
    ],
  },
  {
    id: 'hip-thrust-barra', nombre: 'Hip thrust con barra', grupo: 'Glúteo', sec: ['Femoral'], equipo: 'Barra',
    en: 'Barbell Hip Thrust', rep: [8, 12], rir: '1-2', descanso: 120, incremento: 5, tipo: 'peso',
    claves: [
      'Espalda alta apoyada en un banco, barra sobre la cadera con almohadilla.',
      'Sube hasta alinear hombros, cadera y rodillas y aprieta un segundo.',
      'Barbilla metida: la lumbar no se arquea.',
    ],
  },
  {
    id: 'puente-gluteo', nombre: 'Puente de glúteo con barra', grupo: 'Glúteo', sec: ['Femoral'], equipo: 'Barra',
    en: 'Barbell Glute Bridge', rep: [10, 15], rir: '1-2', descanso: 90, incremento: 5, tipo: 'peso',
    claves: [
      'Tumbada en el suelo, barra sobre la cadera.',
      'Sube la cadera empujando con los talones y aprieta arriba.',
      'Recorrido más corto que el hip thrust y más fácil de preparar.',
    ],
  },
  {
    id: 'extension-cadera', nombre: 'Extensión de cadera en máquina (patada de glúteo de pie)', grupo: 'Glúteo', sec: ['Femoral'], equipo: 'Máquina',
    en: 'One-Legged Cable Kickback', rep: [12, 15], rir: '1-2', descanso: 90, incremento: 2.5, tipo: 'peso',
    fotoNota: 'La foto es de la patada en polea: el movimiento es el mismo, cambia el aparato.',
    claves: [
      'Tronco apoyado y firme, sin balancearte para ayudarte.',
      'Empuja con el talón y sube solo hasta la línea del cuerpo.',
      'Aprieta el glúteo un segundo arriba y baja controlado.',
      'Rodilla poco flexionada y fija durante todo el recorrido.',
    ],
  },
  {
    id: 'abductores', nombre: 'Abductores en máquina', grupo: 'Glúteo', sec: [], equipo: 'Máquina',
    en: 'Thigh Abductor', rep: [15, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Espalda apoyada; inclinarte un poco hacia delante lleva el trabajo al glúteo medio.',
      'Abre hasta el final del recorrido cómodo y aguanta un segundo.',
      'Vuelve despacio, sin que las placas lleguen a chocar.',
      'Sin balanceo del tronco para ayudarte.',
    ],
  },
  {
    id: 'aductores', nombre: 'Aductores en máquina', grupo: 'Glúteo', sec: [], equipo: 'Máquina',
    en: 'Thigh Adductor', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Espalda apoyada, piernas abiertas hasta donde estés cómoda.',
      'Cierra las piernas y aprieta un segundo.',
      'Abre despacio, sin que las placas choquen.',
    ],
  },
  {
    id: 'hiperextensiones', nombre: 'Hiperextensiones en banco de 45°', grupo: 'Glúteo', sec: ['Lumbar', 'Femoral'], equipo: 'Banco',
    en: 'Hyperextensions (Back Extensions)', rep: [12, 15], rir: '1-2', descanso: 90, incremento: 2.5, tipo: 'corporal',
    claves: [
      'Almohadilla justo por debajo de la cadera, para que la cadera pueda doblarse libre.',
      'Baja doblando por la cadera con la espalda neutra, hasta notar el femoral.',
      'Sube solo hasta la línea del cuerpo: nada de hiperextender arriba.',
      'Empieza a peso corporal y añade disco solo cuando pases de 15 repeticiones limpias.',
    ],
  },

  // ============================================================ Gemelo
  {
    id: 'gemelo-de-pie', nombre: 'Gemelo de pie', grupo: 'Gemelo', sec: [], equipo: 'Máquina',
    en: 'Standing Calf Raises', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Recorrido completo: baja el talón hasta estirar y sube hasta la punta.',
      'Un segundo de pausa arriba y otro abajo, sin rebotar.',
      'Rodilla estirada pero sin bloquear.',
      'Peso en el dedo gordo, sin dejar caer el tobillo hacia fuera.',
    ],
  },
  {
    id: 'gemelo-sentado', nombre: 'Gemelo sentada en máquina', grupo: 'Gemelo', sec: [], equipo: 'Máquina',
    en: 'Seated Calf Raise', rep: [12, 20], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Almohadilla sobre los muslos, puntas en el borde.',
      'Baja el talón del todo y sube hasta la punta.',
      'Pausa de un segundo arriba y abajo.',
    ],
  },
  {
    id: 'gemelo-prensa', nombre: 'Gemelo en prensa', grupo: 'Gemelo', sec: [], equipo: 'Máquina',
    en: 'Calf Press On The Leg Press Machine', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 5, tipo: 'peso',
    claves: [
      'Solo las puntas en el borde bajo de la plataforma, piernas casi estiradas.',
      'Empuja con la punta y vuelve hasta estirar el gemelo.',
      'No dobles la rodilla durante el movimiento.',
    ],
  },

  // ============================================================ Abdomen
  {
    id: 'crunch-maquina', nombre: 'Crunch en máquina', grupo: 'Abdomen', sec: [], equipo: 'Máquina',
    en: 'Ab Crunch Machine', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'Acerca las costillas a la pelvis; no es doblar la cadera.',
      'Exhala al bajar y mete el abdomen.',
      'Vuelve solo hasta antes de que la placa descanse, manteniendo la tensión.',
      'La barbilla no cambia de posición: nada de tirar del cuello.',
    ],
  },
  {
    id: 'crunch-polea', nombre: 'Crunch en polea', grupo: 'Abdomen', sec: [], equipo: 'Polea',
    en: 'Cable Crunch', rep: [12, 15], rir: '0-1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'De rodillas frente a la polea alta, cuerda junto a la cabeza.',
      'Enrolla el tronco llevando los codos hacia los muslos.',
      'La cadera no se mueve: trabaja solo el abdomen.',
    ],
  },
  {
    id: 'plancha', nombre: 'Plancha', grupo: 'Abdomen', sec: [], equipo: 'Peso corporal',
    en: 'Plank', rep: [30, 60], rir: '1', descanso: 60, incremento: 0, tipo: 'corporal', segundos: true,
    claves: [
      'Antebrazos en el suelo, codos debajo de los hombros.',
      'Cuerpo recto: aprieta glúteo y abdomen, la cadera no se hunde.',
      'Las repeticiones aquí son segundos.',
    ],
  },
  {
    id: 'crunch-inverso', nombre: 'Crunch inverso', grupo: 'Abdomen', sec: [], equipo: 'Peso corporal',
    en: 'Reverse Crunch', rep: [12, 15], rir: '1', descanso: 60, incremento: 0, tipo: 'corporal',
    claves: [
      'Tumbada, rodillas dobladas y piernas en el aire.',
      'Lleva las rodillas al pecho despegando un poco la cadera del suelo.',
      'Baja despacio sin tocar el suelo con los pies.',
    ],
  },
  {
    id: 'elevacion-piernas', nombre: 'Elevación de piernas tumbada', grupo: 'Abdomen', sec: [], equipo: 'Peso corporal',
    en: 'Flat Bench Lying Leg Raise', rep: [10, 15], rir: '1', descanso: 60, incremento: 0, tipo: 'corporal',
    claves: [
      'Tumbada en un banco, agárrate detrás de la cabeza.',
      'Sube las piernas casi estiradas hasta la vertical.',
      'Baja despacio sin arquear la lumbar: si se arquea, dobla las rodillas.',
    ],
  },
  {
    id: 'pallof', nombre: 'Pallof press', grupo: 'Abdomen', sec: [], equipo: 'Polea',
    en: 'Pallof Press', rep: [10, 12], rir: '1', descanso: 60, incremento: 2.5, tipo: 'peso',
    claves: [
      'De lado a la polea, agarre a la altura del pecho.',
      'Estira los brazos al frente sin dejar que la polea te gire.',
      'Aguanta dos segundos y vuelve. Haz los dos lados.',
    ],
  },
  {
    id: 'dead-bug', nombre: 'Dead bug', grupo: 'Abdomen', sec: [], equipo: 'Peso corporal',
    en: 'Dead Bug', rep: [10, 12], rir: '1', descanso: 60, incremento: 0, tipo: 'corporal',
    claves: [
      'Tumbada boca arriba, brazos al techo y rodillas a 90°.',
      'Estira a la vez un brazo y la pierna contraria sin despegar la lumbar del suelo.',
      'Vuelve y cambia de lado. Cada lado cuenta como una repetición.',
    ],
  },
];

export const CATALOGO_POR_ID = new Map(CATALOGO.map((e) => [e.id, e]));
