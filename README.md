# ChodeApp Admin

Panel web de administración para ChodeApp1 (app de gestión del club). React + Vite + TypeScript + Supabase, pensado para hostearse como sitio estático en GitHub Pages.

**Apunta únicamente a producción** (`swgrqnyxcwsyqnfbqwuk.supabase.co`) — no hay ambiente de staging por ahora.

Ver el plan completo de implementación en `/Users/gon_ochoa/.claude/plans/necesito-crear-una-pagina-misty-peach.md`.

## Repo relacionado

Este panel vive junto a `../ChodeApp1` (la app móvil) dentro de `ChodeApp/`. Son repos de git separados, pero **el esquema y las migraciones de Supabase viven en `ChodeApp1/supabase/migrations/`, no acá** — este repo solo consume esa base. Cualquier tabla/policy nueva que necesite el panel (por ejemplo `market_banned`, `delete_socio`, las políticas de `memberships`) se agrega como migración del lado de `ChodeApp1`, nunca acá.

## Modelo de seguridad

Este panel usa **únicamente la anon key** de Supabase — nunca una service-role key. Toda la autorización real la hace Postgres vía Row Level Security (las mismas políticas que ya protegen la app móvil: `role <> 'user'` para escrituras admin, `role = 'super_admin'` para grupos/clubes/moderación del Market). Los guards de React (`RequireAdmin`, `RequireSuperAdmin`) son solo UX — no son el límite de seguridad.

## Setup local

```bash
npm install
cp .env.example .env   # completar VITE_SUPABASE_ANON_KEY
npm run dev
```

`npm run dev` corre contra producción — el badge rojo "PRODUCCIÓN" en el header es un recordatorio de que las escrituras (aprobar pagos, cambiar roles, borrar comprobantes) son reales.

## Build

```bash
npm run build
```

Nunca commitear `.env` real (está en `.gitignore`). En CI, las keys viven en GitHub Actions repository secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
