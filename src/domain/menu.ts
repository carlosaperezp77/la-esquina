import type { BebidaId, IngredienteId, InsumoId, MetodoPago } from './tipos'

import salchicha from '../assets/iconos/salchicha.png'
import repollo from '../assets/iconos/repollo.png'
import papas from '../assets/iconos/papas.png'
import pepinillo from '../assets/iconos/pepinillo.png'
import cebolla from '../assets/iconos/cebolla.png'
import salsa from '../assets/iconos/salsa.png'
import mayonesa from '../assets/iconos/mayonesa.png'
import mostaza from '../assets/iconos/mostaza.png'
import queso from '../assets/iconos/queso.png'
import nestea from '../assets/iconos/nestea.png'
import refresco from '../assets/iconos/coca.png'
import agua from '../assets/iconos/agua.png'
import efectivo from '../assets/iconos/efectivo.png'
import movil from '../assets/iconos/movil.png'
import tarjeta from '../assets/iconos/tarjeta.png'

export const INGREDIENTES: { id: IngredienteId; nombre: string; icono: string }[] = [
  { id: 'salchicha', nombre: 'Salchicha', icono: salchicha },
  { id: 'repollo', nombre: 'Repollo', icono: repollo },
  { id: 'papas', nombre: 'Papas ralladas', icono: papas },
  { id: 'pepinillo', nombre: 'Pepinillo', icono: pepinillo },
  { id: 'cebolla', nombre: 'Cebolla', icono: cebolla },
  { id: 'salsa', nombre: 'Ketchup', icono: salsa },
  { id: 'mayonesa', nombre: 'Mayonesa', icono: mayonesa },
  { id: 'mostaza', nombre: 'Mostaza', icono: mostaza },
  { id: 'queso', nombre: 'Queso amarillo', icono: queso },
]

/** `tam` se muestra sobre el ícono para distinguir los tamaños de refresco. */
export const BEBIDAS: { id: BebidaId; nombre: string; icono: string; tam?: string }[] = [
  { id: 'nestea', nombre: 'Nestea', icono: nestea },
  { id: 'refresco', nombre: 'Refresco', icono: refresco },
  { id: 'refresco1l', nombre: 'Refresco 1 L', icono: refresco, tam: '1 L' },
  { id: 'refresco2l', nombre: 'Refresco 2 L', icono: refresco, tam: '2 L' },
  { id: 'agua', nombre: 'Agua', icono: agua },
]

export const METODOS_PAGO: { id: MetodoPago; nombre: string; icono: string | null; pideReferencia: boolean }[] = [
  { id: 'efectivo', nombre: 'Efectivo', icono: efectivo, pideReferencia: false },
  { id: 'movil', nombre: 'Pago móvil', icono: movil, pideReferencia: true },
  { id: 'tarjeta', nombre: 'Tarjeta', icono: tarjeta, pideReferencia: false },
  { id: 'transferencia', nombre: 'Transferencia', icono: null, pideReferencia: true },
  { id: 'credito', nombre: 'Crédito', icono: null, pideReferencia: false },
]

/** Orden y nombres del "Inventario entregado para el día" del formato en papel. */
export const INSUMOS: { id: InsumoId; nombre: string }[] = [
  { id: 'panes', nombre: 'Panes' },
  { id: 'salchichas', nombre: 'Salchichas' },
  { id: 'papas', nombre: 'Papas ralladas' },
  { id: 'queso', nombre: 'Queso amarillo' },
  { id: 'repollo', nombre: 'Repollo' },
  { id: 'cebolla', nombre: 'Cebolla' },
  { id: 'pepinillo', nombre: 'Pepinillo' },
  { id: 'salsa', nombre: 'Salsa de tomate' },
  { id: 'mayonesa', nombre: 'Mayonesa' },
  { id: 'mostaza', nombre: 'Mostaza' },
  { id: 'nestea', nombre: 'Nestea' },
  { id: 'refrescos', nombre: 'Refrescos' },
  { id: 'refrescos1l', nombre: 'Refrescos 1 L' },
  { id: 'refrescos2l', nombre: 'Refrescos 2 L' },
  { id: 'agua', nombre: 'Agua' },
]

export const MESAS = ['1', '2', '3', '4', '5', '6']
