# 🎬 Estudio Viral IA

Creá videos virales con IA **gratis**: desde una idea, un guion, un link de YouTube/TikTok o tu propio audio.
La IA escribe el guion, genera las imágenes en el estilo que elijas, pone voz, subtítulos y música, y arma el video.

## ¿Qué hay en esta carpeta?

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Toda la app (la página que ves) |
| `api/transcript.js` | Mini servidor que lee los links de YouTube y TikTok |
| `README.md` | Esta guía |

---

## 🚀 Publicarla gratis (GitHub + Vercel) — paso a paso

### 1. Subir a GitHub
1. Entrá a **github.com** y creá una cuenta (gratis).
2. Arriba a la derecha tocá **+** → **New repository**.
3. Nombre: `estudio-viral` → marcá **Public** → **Create repository**.
4. Tocá **uploading an existing file**.
5. Arrastrá `index.html` y `README.md`.
6. Para la carpeta `api`: tocá **Add file → Create new file**, escribí como nombre `api/transcript.js` (al poner la barra `/` se crea la carpeta) y pegá adentro el contenido del archivo `transcript.js`.
7. Tocá **Commit changes**.

### 2. Publicar en Vercel
1. Entrá a **vercel.com** → **Sign up** → **Continue with GitHub**.
2. Tocá **Add New… → Project**.
3. Elegí `estudio-viral` → **Import** → **Deploy** (no cambies nada).
4. En un minuto te da tu link, tipo `https://estudio-viral.vercel.app` 🎉

Cada vez que cambies algo en GitHub, Vercel actualiza la página solo.

### 3. (Recomendado) Clave gratis de IA
Sin clave funciona, pero es más lento y la voz IA puede fallar.
1. Entrá a **enter.pollinations.ai** y registrate con GitHub.
2. Creá una clave **publishable** (empieza con `pk_`).
3. En la app: **Ajustes → Clave** → pegala → **Probar conexión**.

---

## ✨ Qué trae (v2)

- **Géneros y Estilos Visuales**: 52 estilos en 7 categorías (Animación, Realismo, Época, Ficción, Arte, Cómic, Comercial) y 37 géneros/formatos con subgéneros y look recomendado.
- **6 formas de crear**: Texto a Video, Guion, URL (YouTube/TikTok), Audio a Video (corta en tus silencios), Imagen a Video (fotos con profundidad 2.5D) y Música a Videoclip (cortes al ritmo).
- **Editor profesional**: panel de dirección (formato 9:16/16:9/1:1, cámara, lente, look), storyboard, vista previa, herramientas por escena y línea de tiempo con voz y música.
- **Cámara virtual**: zoom, paneo, tilt, dolly, seguimiento, cámara en mano, bokeh.
- **Look de película**: color grading (Teal & Orange, Matrix, neón…), VHS, 16mm, Super 8, cine mudo, glitch, aberración cromática, grano. La IA puede elegirlo.
- **Edición IA por escena**: nueva imagen, editar con una orden, mejorar calidad, expandir encuadre, rotoscopia 2.5D, cambiar fondo, animar (beta), variaciones con antes/después.
- **Sonido**: música sin derechos, whooshes, impactos y ambientes (lluvia, viento, océano, fuego…).
- **Próximamente**: Video a Video y Lip-sync (necesitan servidores pagos).

## 🧠 Cómo se usa

- **Lo más fácil:** tocá **Asistente IA** y escribile o hablale:
  *"Hacé un video de 60 segundos sobre los espartanos, estilo anime, vertical"*.
- **Paso a paso:** Nuevo video → Modo → Formato → Estilo → Título → Generar guion → revisar escenas → voces → **Exportar**.
- El video se graba en tiempo real (1 minuto de video = 1 minuto de espera). No cambies de pestaña mientras graba. Funciona mejor en **Chrome**.

## 🆓 Servicios gratis que usa

- **Pollinations.ai** → texto (guiones), imágenes y voces.
- **Vercel** → hosting y el servidor de links.
- **Navegador** → arma el video (canvas), música generada sin derechos de autor y dictado por voz.

## ⚠️ Limitaciones honestas

- YouTube a veces bloquea la lectura de subtítulos desde servidores. Si pasa, pegá el texto a mano.
- TikTok solo comparte la descripción del video, no lo que se habla.
- Respetá los derechos de autor: usá links como inspiración y dejá que la IA reescriba con otras palabras.
- Los proyectos se guardan en tu navegador. Usá **Ajustes → Exportar** para tener copia.
