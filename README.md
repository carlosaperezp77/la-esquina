# La Esquina

App de comandas, cobro, inventario y cierre de caja para La Esquina, perros calientes.
Es una web app instalable (PWA): se abre desde el navegador en teléfonos y laptops y se puede agregar a la pantalla de inicio.

## Qué hace hoy (etapa 1)

- **Caja**: toma el pedido con el diseño de la comanda (cantidad, "con todo", ingredientes, bebidas, nombre o mesa, observaciones), muestra el monto en $ y Bs, y cobra cuando el cliente termina (efectivo, pago móvil, tarjeta, transferencia).
- **Cocina**: ve las comandas en orden de llegada y las pasa de *Nuevas* a *Preparando* a *Listas*. Suena cuando entra una nueva.
- **Mesero**: toma pedidos y recibe el aviso cuando una comanda está lista para servir.

Antes de tomar pedidos, el cajero hace la **apertura del día**: escribe la tasa BCV y los precios en bolívares, y la app muestra el equivalente en dólares. Cada comanda guarda la tasa y el total con que se creó.

## Probarla en tu equipo

```bash
npm install
npm run dev
```

Abre la dirección que aparece y usa pestañas distintas para Caja, Cocina y Mesero.
Sin configuración corre en **modo demo**: los datos quedan solo en ese navegador.

## Usarla en varios equipos a la vez (Supabase)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En *SQL Editor* ejecuta, en orden, los archivos de `supabase/migrations/`.
3. Copia `.env.example` a `.env.local` y pon la URL y la clave pública (*Project Settings → API*).
4. `npm run dev` otra vez: arriba a la derecha dirá "En línea".

> La etapa 1 deja la tabla abierta a quien tenga la clave pública. Antes de usarla en el local se agrega inicio de sesión por rol.

## Publicación

Cada cambio que entra a `main` se publica solo en GitHub Pages:
https://carlosaperezp77.github.io/la-esquina/ (flujo `.github/workflows/publicar.yml`, rama `gh-pages`).

## Comandos

| Comando | Para qué |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas |
| `npm run lint` | Revisión de código |
| `npm run build` | Versión para publicar en `dist/` |
