# Entreno

App personal de entrenamiento y alimentación para iPhone. Uso propio, no es un producto.

- **Se instala desde Safari** y se abre a pantalla completa, como una app.
- **Funciona sin cobertura**, fotos de los ejercicios incluidas.
- **Sin cuentas ni servidor.** Los datos viven en el móvil, en IndexedDB.
- **Sin compilar nada.** HTML, CSS y JavaScript con módulos ES. La única pieza de
  fuera es Preact + htm (13 KB), copiada dentro del repositorio en `js/vendor/`.

## Instalarla en el iPhone

1. Abre la dirección de GitHub Pages en **Safari**.
2. Botón de compartir → **Añadir a pantalla de inicio**.
3. Ábrela siempre desde el icono, no desde Safari: son almacenes de datos distintos.

## Copias de seguridad

Ajustes → **Guardar copia** abre el menú de compartir del iPhone: guárdala en
Archivos o en iCloud. **Recuperar una copia** la vuelve a cargar. Sin tokens ni cuentas.

## Probarla en el ordenador

```
node servidor.mjs
```

Y abre http://localhost:5173

## Qué hay dentro

```
index.html              La cáscara
manifest.webmanifest    Nombre e icono al instalarla
sw.js                   Guarda la app y las fotos para usarla sin cobertura
css/app.css             Todo el diseño; los colores están en un único bloque de tema
img/ej/                 Dos fotos por ejercicio (inicio y final), en WebP
js/
  app.js                Arranque y navegación
  estado.js             Estado compartido y carga de datos
  comunes.js            Iconos, pestañas, hojas, fotos animadas, gráficas
  descanso.js           Temporizador de descanso, pitido, vibración, pantalla encendida
  db.js                 Capa fina sobre IndexedDB, exportar e importar
  logica.js             TODAS las reglas: progresión, fases, objetivos, medias
  dia.js                Lo que necesita una fecha concreta
  seed.js               Tus datos de partida: objetivos, rutina, tus alimentos y recetas
  datos/
    catalogo-ejercicios.js   Los 69 ejercicios que merecen la pena, con técnica
    alimentos-base.js        225 alimentos normales con sus macros
  pantallas/            Hoy, Entreno, Ejercicios, Comida, Progreso, Ajustes
  vendor/preact-htm.js  Preact + htm
test-logica.mjs         Pruebas de las reglas: node test-logica.mjs
```

## Las reglas que implementa

**Entrenamiento**

- Cuatro sesiones en rotación A → B → C → D, sin atarse a días. Los entrenos libres
  no cuentan para la rotación.
- Cada serie con peso, repeticiones y RIR. Al marcarla empieza el descanso de ese ejercicio.
- Progresión doble: todas las series al tope del rango con RIR ≥ 1 → la app propone subir.
- Estancamiento: tres sesiones iguales → bajar un 10 % y volver a subir.
- Reacondicionamiento las dos primeras semanas y descarga cada 8, con RIR 3-4.
- Límite de 55 minutos con cronómetro. Récords y máximo a una repetición calculado.
- Avisos en los ejercicios que pueden molestar la rodilla (menisco) o el hombro izquierdo.

**Alimentación**

- 1.815 kcal los días con gimnasio y 1.680 los días sin; la app lo detecta sola.
- Proteína 145 g, grasa 62 g, hidratos lo que queda. Suelo de 1.600 kcal.
- Alimentos normales ya cargados, los tuyos, recetas y **comidas habituales**: cualquier
  toma se guarda para repetirla con un toque.
- El desvío de la semana se reparte cuando tú lo decides, respetando el suelo.

## De dónde salen los datos

- Fotos de ejercicios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db), dominio público.
- Alimentos: USDA FoodData Central, SR Legacy (dominio público), con nombres en español.
  Los marcados «aprox.» son valores típicos de etiqueta de productos de aquí.
