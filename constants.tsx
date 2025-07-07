
import React from 'react';
import { Service } from './types';
import { CutIcon, BeardIcon, ScissorAndCombIcon, HotTowelIcon } from './components/icons';

export const SERVICES: Service[] = [
  {
    id: 1,
    name: "Corte de Cabello Clásico",
    description: "Un corte de precisión adaptado a tu estilo, finalizado con un peinado profesional.",
    price: 25,
    duration: 30,
    icon: <CutIcon className="h-8 w-8 text-brand-gold" />,
  },
  {
    id: 2,
    name: "Afeitado con Toalla Caliente",
    description: "La experiencia de afeitado definitiva con navaja, aceites y toallas calientes.",
    price: 30,
    duration: 45,
    icon: <HotTowelIcon className="h-8 w-8 text-brand-gold" />,
  },
  {
    id: 3,
    name: "Arreglo de Barba",
    description: "Define y dale forma a tu barba con un recorte experto, perfilado y aceite para barba.",
    price: 20,
    duration: 30,
    icon: <BeardIcon className="h-8 w-8 text-brand-gold" />,
  },
  {
    id: 4,
    name: "Paquete Completo",
    description: "El servicio premium: corte de cabello, arreglo de barba y afeitado con toalla caliente.",
    price: 65,
    duration: 75,
    icon: <ScissorAndCombIcon className="h-8 w-8 text-brand-gold" />,
  },
];
