import React from 'react';

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  icon?: React.ReactNode;
}

export interface Barber {
  id: number;
  name:string;
  specialty: string;
  imageUrl: string;
}

export interface Appointment {
  id: string;
  clientId: number;
  service: Service;
  barber: Barber;
  date: Date;
  time: string;
  clientName: string;
  clientPhone: string;
  status: 'confirmed' | 'cancelled' | 'pending' | 'rejected';
}

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string; // For mock auth
  role: 'client' | 'barber' | 'admin';
}