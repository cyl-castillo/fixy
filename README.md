# Fixy Landing

Landing estática de Fixy lista para desplegar en GitHub Pages.

## Stack

- `index.html`
- `styles.css`
- `script.js`

Sin framework, sin build step y compatible con GitHub Pages.

## Qué hace

- presenta Fixy como marca pública
- enfoca la propuesta en servicios urgentes del hogar en Ciudad de la Costa
- usa el backend de Fixy como intake inicial
- incluye CTA para clientes y proveedores

## Estado actual

La experiencia actual es una primera interfaz agent-ready:
- captura el problema del usuario
- envía el lead al backend
- muestra qué entendió Fixy
- permite sumar contexto adicional
- dispara matching inicial

## Enfoque actual del MVP

- geografía: Ciudad de la Costa
- categorías iniciales:
  - plomería
  - barométrica
  - jardinería

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

- evolucionar a UX más conversacional real
- revisar copy final para lanzamiento
- conectar analytics
- definir dominio propio si aplica
- alinear mensaje público con supply bootstrap cuando ya esté operativo
