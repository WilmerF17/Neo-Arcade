# NEO ARCADE — Guía Sitio Web Oficial + Instalable (PWA)

Tu app ya es **PWA 100% instalable** en PC y móvil + **SEO oficial** para Google. Solo falta publicarla.

---

## ✅ Lo que ya está hecho (últimos detalles)

### 1. PWA Instalable (PC + Móvil)
- **vite-plugin-pwa 0.21.1** configurado en `vite.config.ts:110`
- **Service Worker** `sw.js` + `workbox` con precache 33 archivos + cache de Google Fonts
- **Manifest completo** (`public/manifest.json` + auto `manifest.webmanifest`) con:
  - `icons 192x192` y `512x512 maskable`
  - `shortcuts`, `screenshots`, `display_override`, `categories`
- **Banner de instalación** `src/components/PWAInstall.tsx:1` → aparece automático cuando el navegador detecta que se puede instalar
- `src/main.tsx:11` registra el SW al cargar

**Resultado:** En Chrome/Edge aparece ícono **Instalar** en la barra. En móvil: Compartir → *Añadir a pantalla de inicio*.

### 2. SEO Oficial (buscable en Google)
- `index.html` mejorado: `title` SEO, `meta keywords`, `canonical`, `og:*`, `twitter:*`, `JSON-LD WebApplication` (schema.org)
- `public/robots.txt` + `public/sitemap.xml`
- `vercel.json`, `public/_redirects` y `public/_headers` para deploy SPA + caché
- Build verificado: `dist/` con `sw.js`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`

Build probado: `npm run build` ✓ 33 entradas precacheadas, 177kB gzip

---

## 🚀 Cómo volverlo SITIO OFICIAL (3 opciones, elige 1)

### Opción A — Vercel (recomendada, 2 min, gratis, HTTPS automático)
```bash
npm i -g vercel
vercel --prod
# Sigue el asistente: link a tu cuenta GitHub, root = neo-arcade, framework = Vite
# Obtendrás: https://neo-arcade-xxxx.vercel.app
```
Luego:
1. En **vercel.com/dashboard → tu proyecto → Settings → Domains** añade tu dominio real si tienes (ej: `neoarcade.com`)
2. Cambia en `index.html` y `public/robots.txt` / `public/sitemap.xml` el `https://neo-arcade.vercel.app` por tu dominio real y haz `npm run build` + `vercel --prod` de nuevo.
3. Ve a **Google Search Console** → *Añadir propiedad* → pega tu URL → *Inspeccionar URL* → *Solicitar indexación*. En 24-48h aparece en Google al buscar "NEO ARCADE".

### Opción B — Netlify (drag & drop)
1. Ve a **app.netlify.com/drop**
2. Arrastra la carpeta `dist/` → te da URL `https://xxx.netlify.app`
3. Para dominio propio: *Domain settings → Add custom domain*

### Opción C — GitHub Pages (gratis, auto-deploy con Git)
Ya tienes workflow `.github/workflows/deploy.yml`:
```bash
git init
git add .
git commit -m "NEO ARCADE v3.1 PWA oficial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/neo-arcade.git
git push -u origin main
```
Ve a **GitHub → Settings → Pages → Source: GitHub Actions** → tu sitio estará en `https://TU_USUARIO.github.io/neo-arcade/`
> Si usas GitHub Pages en sub-ruta, cambia en `vite.config.ts` el `base: '/neo-arcade/'` y reconstruye.

---

## 📲 Cómo instalar (para probar local ya funciona)

**PC (Chrome/Edge/Brave):**
- Abre `http://localhost:3000` tras `npm run preview` → verás banner **📲 INSTALAR NEO ARCADE** abajo + ícono ⬇️ en barra de direcciones → Click Instalar → se abre como app nativa.

**Móvil (Android/iOS):**
- Android Chrome: menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*
- iOS Safari: Compartir ⎙ → *Añadir a pantalla de inicio* → abre como app a pantalla completa, offline.

**Offline:** una vez instalado, desconecta internet y sigue jugando (todo cacheado por Workbox).

---

## 🔍 Cómo aparecer en Google (después del deploy)

1. Deploy a Vercel/Netlify y copia tu URL oficial
2. Actualiza `index.html:15` `<link rel="canonical" href="TU_URL">` y `og:url`, y el `url` del JSON-LD
3. Actualiza `public/sitemap.xml` y `public/robots.txt` con TU_URL
4. `npm run build` + redeploy
5. **Google Search Console**: https://search.google.com/search-console → Añade propiedad → Sube `sitemap.xml` → Solicita indexación
6. **Bing Webmaster** opcional: https://www.bing.com/webmasters

Con el `sitemap.xml` + `robots.txt` + `JSON-LD` y HTTPS, Google te indexa en horas/días.

---

## 🧪 Verificación local

```bash
npm run build
npm run preview  # abre http://localhost:3000
# DevTools → Application → Manifest (debe mostrar NEO ARCADE, icons, shortcuts)
# DevTools → Application → Service Workers (debe mostrar sw.js activo)
# Lighthouse → PWA → debe dar 100/100
```

---

## 📦 Archivos clave modificados

- `vite.config.ts` — plugin VitePWA + workbox
- `public/manifest.json` + `public/icon-192.png` / `icon-512.png`
- `index.html` — SEO + JSON-LD + canónica + OG
- `src/main.tsx` — registro SW
- `src/components/PWAInstall.tsx` — banner instalación
- `public/robots.txt`, `public/sitemap.xml`, `vercel.json`

¡Listo para ser sitio oficial! Elige una opción de deploy y ya es instalable y buscable.
