
import React, { useState, useCallback, useEffect } from 'react';
import { Appointment, Barber, Service, User } from '@/types.ts';
import Stepper from '@/components/Stepper.tsx';
import ServiceSelector from '@/components/ServiceSelector.tsx';
import BarberSelector from '@/components/BarberSelector.tsx';
import DateTimePicker from '@/components/DateTimePicker.tsx';
import ConfirmationScreen from '@/components/ConfirmationScreen.tsx';
import SuccessScreen from '@/components/SuccessScreen.tsx';
import { CutIcon, LogoutIcon, UserIcon } from '@/components/icons.tsx';
import AuthScreen from '@/components/AuthScreen.tsx';
import BarberDashboard from '@/components/BarberDashboard.tsx';
import AdminDashboard from '@/components/AdminDashboard.tsx';
import ClientDashboard from '@/components/ClientDashboard.tsx';
import { getBarbers, getAppointmentsForBarber, createAppointment } from '@/services/geminiService.ts';

type Step = 'SERVICE' | 'BARBER' | 'DATETIME' | 'CONFIRM' | 'SUCCESS';
type ClientView = 'dashboard' | 'booking';

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('SERVICE');
  const [currentAppointment, setCurrentAppointment] = useState<Partial<Appointment>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [clientView, setClientView] = useState<ClientView>('dashboard');

  // Booking flow specific state
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberAppointments, setBarberAppointments] = useState<Appointment[]>([]);


  // Check for logged in user on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('currentUser');
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    if (user.role === 'client') {
      setClientView('dashboard');
    }
  };

  const resetBookingFlow = useCallback(() => {
    setCurrentAppointment({});
    setStep('SERVICE');
    setBarbers([]);
    setBarberAppointments([]);
  }, []);

  const goToDashboardAndReset = useCallback(() => {
    resetBookingFlow();
    if (currentUser?.role === 'client') {
      setClientView('dashboard');
    }
  }, [currentUser, resetBookingFlow]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    goToDashboardAndReset();
  };
  
  // --- Booking Flow Logic ---
  
  // Fetch barbers when booking starts
  useEffect(() => {
    if (currentUser?.role === 'client' && clientView === 'booking' && step === 'BARBER') {
      const fetchBarbers = async () => {
        try {
          const data = await getBarbers();
          setBarbers(data);
        } catch (error) {
          console.error(error);
          alert('No se pudieron cargar los barberos. Inténtalo de nuevo.');
        }
      };
      fetchBarbers();
    }
  }, [currentUser, clientView, step]);
  
  // Fetch appointments for a selected barber
  const fetchAppointmentsForBarber = async (barberId: number) => {
      try {
          const data = await getAppointmentsForBarber(barberId);
          setBarberAppointments(data.map((app: any) => ({...app, date: new Date(app.date)})));
      } catch (error) {
          console.error(error);
          alert('No se pudieron cargar las citas del barbero.');
      }
  };

  const handleServiceSelect = (service: Service) => {
    setCurrentAppointment(prev => ({ ...prev, service }));
    setStep('BARBER');
  };

  const handleBarberSelect = (barber: Barber) => {
    setCurrentAppointment(prev => ({ ...prev, barber }));
    fetchAppointmentsForBarber(barber.id);
    setStep('DATETIME');
  };

  const handleDateTimeSelect = (date: Date, time: string) => {
    setCurrentAppointment(prev => ({ ...prev, date, time }));
    setStep('CONFIRM');
  };

  const handleConfirm = async (phone: string) => {
    if (!currentUser || !currentAppointment.service || !currentAppointment.barber || !currentAppointment.date || !currentAppointment.time) return;
    
    const newAppointmentRequest = {
      ...currentAppointment,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientPhone: phone,
      status: 'pending'
    };

    try {
      const createdAppointment = await createAppointment(newAppointmentRequest);
      setCurrentAppointment({...createdAppointment, date: new Date(createdAppointment.date)});
      setStep('SUCCESS');
    } catch(error) {
      console.error(error);
      alert('Hubo un error al crear tu cita. Por favor, inténtalo de nuevo.');
    }
  };

  const goBack = () => {
    if (step === 'BARBER') setStep('SERVICE');
    if (step === 'DATETIME') setStep('BARBER');
    if (step === 'CONFIRM') setStep('DATETIME');
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.role === 'admin') {
    return <AdminDashboard 
            currentUser={currentUser}
            onLogout={handleLogout} 
          />;
  }

  if (currentUser.role === 'barber') {
    return <BarberDashboard 
              currentUser={currentUser}
              onLogout={handleLogout} 
            />;
  }

  if (currentUser.role === 'client') {
    if (clientView === 'dashboard') {
      return <ClientDashboard 
        currentUser={currentUser}
        onNewAppointmentClick={() => {
          resetBookingFlow();
          setClientView('booking');
        }}
        onLogout={handleLogout}
      />
    }
    
    // Client is in booking mode
    const steps = [
      { id: 'SERVICE', name: 'Servicio' },
      { id: 'BARBER', name: 'Barbero' },
      { id: 'DATETIME', name: 'Fecha y Hora' },
      { id: 'CONFIRM', name: 'Confirmar' },
    ];
    const currentStepIndex = steps.findIndex(s => s.id === step);

    const renderStep = () => {
      switch (step) {
        case 'SERVICE':
          return <ServiceSelector onSelect={handleServiceSelect} />;
        case 'BARBER':
          return <BarberSelector barbers={barbers} onSelect={handleBarberSelect} onBack={goBack} />;
        case 'DATETIME':
          return <DateTimePicker 
                    service={currentAppointment.service!} 
                    barber={currentAppointment.barber!} 
                    appointments={barberAppointments}
                    onSelect={handleDateTimeSelect} 
                    onBack={goBack} />;
        case 'CONFIRM':
          return <ConfirmationScreen appointment={currentAppointment} currentUser={currentUser} onConfirm={handleConfirm} onBack={goBack} />;
        case 'SUCCESS':
          return <SuccessScreen appointment={currentAppointment as Appointment} onReset={goToDashboardAndReset} />;
        default:
          return null;
      }
    };

    return (
      <div className="min-h-screen bg-brand-dark text-brand-light font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <header className="w-full max-w-4xl relative flex flex-col items-center mb-8">
          <button onClick={goToDashboardAndReset} className="absolute top-2 left-2 text-gray-300 hover:text-brand-gold transition-colors flex items-center space-x-2 bg-gray-800/50 rounded-full px-4 py-2 backdrop-blur-sm">
            <span>&larr; Mi Panel</span>
          </button>
          <div className="flex items-center space-x-4">
              <CutIcon className="h-10 w-10 text-brand-gold" />
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-display text-white tracking-wider">BARBA STORE</h1>
              <CutIcon className="h-10 w-10 text-brand-gold transform -scale-x-100" />
          </div>
          <p className="text-gray-400 mt-2 text-lg">AGENDA TU CITA</p>
          <div className="absolute top-0 right-0 flex items-center space-x-4 text-white">
            <div className="flex items-center space-x-2">
              <UserIcon className="h-6 w-6 text-brand-gold" />
              <span className="font-semibold hidden sm:inline">{currentUser.name}</span>
            </div>
            <button onClick={handleLogout} title="Cerrar Sesión" className="p-2 rounded-full hover:bg-gray-700 transition-colors">
              <LogoutIcon className="h-6 w-6 text-gray-400 hover:text-white"/>
            </button>
          </div>
        </header>

        <main className="w-full max-w-4xl bg-gray-800/50 rounded-lg shadow-2xl p-6 sm:p-8 backdrop-blur-sm border border-gray-700">
          {step !== 'SUCCESS' && (
            <Stepper steps={steps.map(s => s.name)} currentStep={currentStepIndex} />
          )}
          <div className="mt-8">
              {renderStep()}
          </div>
        </main>
        <footer className="mt-8 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Barba Store. Todos los derechos reservados.</p>
        </footer>
      </div>
    );
  }

  return null;
};

export default App;
