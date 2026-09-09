# Entreno y comida

Aplicación web personal para registrar entrenamiento y alimentación. Uso propio,
no es un producto.

- **Funciona sin conexión** y se instala en el móvil como una app (PWA).
- **Sin servidor ni cuentas.** Todos los datos viven en el dispositivo, en IndexedDB.
- **Sin dependencias.** HTML, CSS y JavaScript nativo con módulos ES. No hay que
  compilar nada: lo que hay en el repositorio es exactamente lo que se ejecuta.

## Instalarla en el móvil

1. Abre la dirección de GitHub Pages en Chrome.
2. Menú de los tres puntos → **Añadir a pantalla de inicio**.
3. Se abre a pantalla completa, sin barra del navegador, y funciona sin cobertura.

## Probarla en el ordenador

```
node servidor.mjs
```

Y abre http://localhost:5173

## Copias de seguridad

Dos caminos, en Ajustes → Copia y sync:

- **Archivo JSON.** Exporta todo (series, comidas, peso, recetas, ajustes) a un
  archivo. Sirve para cambiar de móvil.
- **GitHub.** Guarda ese mismo JSON en un repositorio **privado** aparte. Da copia
  fuera del móvil, historial de versiones y los mismos datos en el móvil y el PC.
  Requiere un token de acceso restringido a ese único repositorio; las
  instrucciones están dentro de la propia pantalla.

Los datos **nunca** se guardan en este repositorio, que es público.

## Qué hay dentro

```
index.html            La cáscara: cabecera, contenedor y barra de navegación
manifest.webmanifest  Metadatos para que se pueda instalar
sw.js                 Service worker: red primero, caché si no hay conexión
css/styles.css        Todo el diseño. Móvil primero, toques de 52 px mínimo
js/
  app.js              Arranque, estado compartido, siembra inicial y navegación
  db.js               Capa fina sobre IndexedDB, exportar e importar
  seed.js             Datos de partida: rutina, ejercicios, alimentos, recetas
  logica.js           TODAS las reglas: progresión, fases, objetivos, medias
  dia.js              Lo que necesita una fecha concreta
  selector-comida.js  El diálogo de añadir comida (dos o tres toques)
  ui.js               Construir nodos, diálogos y gráficos SVG
  sync.js             Sincronización con GitHub
  vistas/             Una pantalla por archivo
test-logica.mjs       Pruebas de las reglas: node test-logica.mjs
hacer-iconos.mjs      Genera los PNG de los iconos sin dependencias
servidor.mjs          Servidor estático para desarrollo
```

## Las reglas que implementa

**Entrenamiento**

- Cuatro sesiones en rotación continua A → B → C → D → A, sin atarse a días.
- Límite de 55 minutos con cronómetro que avisa al pasarse. Sin cardio.
- Cada serie se registra con peso, repeticiones y **RIR obligatorio**.
- Progresión doble: todas las series al tope del rango con RIR ≥ 1 → subir según
  el incremento de ese ejercicio.
- Estancamiento: tres sesiones con el mismo peso y las mismas repeticiones →
  bajar un 10% y volver a subir.
- Reacondicionamiento: las dos primeras semanas, RIR 3-4 en todo.
- Descarga: cada 8 semanas, mitad de series, mismo peso y RIR 3-4.
- Temporizador de descanso automático al guardar cada serie.

**Alimentación**

- 1.815 kcal los días con gimnasio, 1.680 los días sin. La app detecta sola si ha
  habido sesión ese día.
- Proteína 145 g siempre, grasa 62 g, hidratos lo que queda.
- Suelo absoluto de 1.600 kcal.
- Avisos neutros: proteína por debajo del 60% a partir de las 17:00, grasa por
  debajo de 55 g al cerrar el día, día por debajo de 1.600 kcal.
- Biblioteca de alimentos con kcal, proteína, grasa, hidratos, fibra y sal.
  Las marcadas con ★ vienen de la etiqueta del producto.
- Recetario con macros por ración calculados desde esa misma biblioteca.
- El desvío semanal se reparte a mano, cuando tú lo decides.

**Seguimiento**

- Peso diario, pero el dato principal es la media móvil de 7 días.
- Pasos, objetivo 10.000. Medidas cada 4 semanas.
- Resumen semanal: media de calorías y proteína, sesiones y evolución del peso.
