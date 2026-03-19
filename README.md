# Fixy Landing

Landing estática de Fixy lista para desplegar en GitHub Pages.

## Stack

- `index.html`
- `styles.css`
- `script.js`

Sin framework, sin build step y compatible con GitHub Pages.

## Qué hace

- presenta Fixy como marca pública
- enfoca la propuesta en urgencias del hogar en Montevideo
- usa WhatsApp como canal principal
- incluye CTA para clientes y proveedores

## WhatsApp

El número configurado está en `script.js`:

```js
const WHATSAPP_NUMBER = "59893551242";
```

Mensajes actuales:

- cliente: `Hola, necesito ayuda con un problema en casa.`
- proveedor: `Hola, quiero unirme como proveedor a Fixy.`

## Deploy en GitHub Pages

### Opción 1: repo dedicado para la landing

1. Subir estos archivos a la raíz del repo:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `.nojekyll`
2. Ir a **Settings → Pages**
3. En **Build and deployment**, elegir:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` o `master`
   - **Folder:** `/ (root)`
4. Guardar
5. Esperar la URL pública de GitHub Pages

### Opción 2: carpeta dentro de un repo existente

Si la landing va en una subcarpeta, GitHub Pages no la publica sola desde ahí salvo que uses una rama/build específica. Para V1 conviene usarla como repo dedicado o mover estos archivos a la raíz del sitio a publicar.

## Vista previa local

Abrir `index.html` en el navegador o servir la carpeta con cualquier servidor estático simple.

Ejemplo:

```bash
cd /home/father/Documents/workspaces/fixy
python3 -m http.server 8080
```

Luego abrir:

- `http://localhost:8080`

## Próximos pasos sugeridos

- agregar favicon
- agregar metadatos Open Graph
- conectar analytics
- definir dominio propio si aplica
- revisar copy final antes de publicar
