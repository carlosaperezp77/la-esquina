import type { BebidaId, IngredienteId, MetodoPago } from './tipos'

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
import coca from '../assets/iconos/coca.png'
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
  { id: 'salsa', nombre: 'Salsa de tomate', icono: salsa },
  { id: 'mayonesa', nombre: 'Mayonesa', icono: mayonesa },
  { id: 'mostaza', nombre: 'Mostaza', icono: mostaza },
  { id: 'queso', nombre: 'Queso amarillo', icono: queso },
]

export const BEBIDAS: { id: BebidaId; nombre: string; icono: string }[] = [
  { id: 'nestea', nombre: 'Nestea', icono: nestea },
  { id: 'coca', nombre: 'Coca-Cola', icono: coca },
  { id: 'agua', nombre: 'Agua', icono: agua },
]

export const METODOS_PAGO: { id: MetodoPago; nombre: string; icono: string | null; pideReferencia: boolean }[] = [
  { id: 'efectivo', nombre: 'Efectivo', icono: efectivo, pideReferencia: false },
  { id: 'movil', nombre: 'Pago móvil', icono: movil, pideReferencia: true },
  { id: 'tarjeta', nombre: 'Tarjeta', icono: tarjeta, pideReferencia: false },
  { id: 'transferencia', nombre: 'Transferencia', icono: null, pideReferencia: true },
]

export const MESAS = ['1', '2', '3', '4', '5', '6']
