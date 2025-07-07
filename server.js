
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require("@google/genai");
const bcrypt = require('bcrypt');

const app = express();
const port = 3001;
const saltRounds = 10; // For bcrypt

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

// --- GEMINI SETUP ---
const API_KEY = process.env.API_KEY;
let ai;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn("API_KEY for Gemini is not set. The confirmation message generation will use a fallback.");
}

// --- IN-MEMORY DATABASE ---
const db = {
    users: [
        { id: 999, name: "Admin", email: "admin@barbastore.com", password: "admin123", role: "admin" },
        { id: 1, name: "Javier 'El Navaja' Ríos", email: "javier@barbastore.com", password: "password123", role: "barber" },
        { id: 2, name: "Carlos 'El Estilista' Mendoza", email: "carlos@barbastore.com", password: "password123", role: "barber" },
        { id: 3, name: "Luis 'El Barbas' González", email: "luis@barbastore.com", password: "password123", role: "barber" },
        { id: 101, name: "Andrés Cliente", email: "andres@cliente.com", password: "password123", role: "client" }
    ],
    barbers: [
        { id: 1, name: "Javier 'El Navaja' Ríos", specialty: "Afeitados clásicos y fade", imageUrl: "https://picsum.photos/seed/javier/400/400" },
        { id: 2, name: "Carlos 'El Estilista' Mendoza", specialty: "Cortes modernos y peinados", imageUrl: "https://picsum.photos/seed/carlos/400/400" },
        { id: 3, name: "Luis 'El Barbas' González", specialty: "Diseño y cuidado de barbas", imageUrl: "https://picsum.photos/seed/luis/400/400" },
    ],
    appointments: [],
};

// --- HASH INITIAL PASSWORDS ---
const hashInitialPasswords = async () => {
    for (const user of db.users) {
        if (user.password) {
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            user.password = hashedPassword;
        }
    }
};


// --- API ENDPOINTS ---

// AUTH
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email);
    
    if (user && await bcrypt.compare(password, user.password)) {
        // In a real app, never send the password back
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } else {
        res.status(401).json({ message: 'Credenciales incorrectas' });
    }
});

app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (db.users.some(u => u.email === email)) {
        return res.status(400).json({ message: 'Este email ya está registrado' });
    }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = {
        id: Date.now(),
        name,
        email,
        password: hashedPassword,
        role: 'client',
    };
    db.users.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
});

// USERS
app.get('/api/users', (req, res) => {
    // Exclude passwords from the response
    const users = db.users.map(({ password, ...user }) => user);
    res.json(users);
});

app.put('/api/users/:id/password', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        db.users[userIndex].password = hashedPassword;
        res.json({ message: 'Contraseña actualizada exitosamente' });
    } else {
        res.status(404).json({ message: 'Usuario no encontrado' });
    }
});

// BARBERS
app.get('/api/barbers', (req, res) => {
    res.json(db.barbers);
});

app.post('/api/barbers', async (req, res) => {
    const { name, email, password, specialty, imageUrl } = req.body;
    const newId = Date.now();
    
    if (db.users.some(u => u.email === email)) {
        return res.status(400).json({ message: 'Email de barbero ya existe' });
    }
    
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newBarberUser = { id: newId, name, email, password: hashedPassword, role: 'barber' };
    const newBarberProfile = { id: newId, name, specialty, imageUrl };
    
    db.users.push(newBarberUser);
    db.barbers.push(newBarberProfile);
    
    res.status(201).json(newBarberProfile);
});

app.delete('/api/barbers/:id', (req, res) => {
    const barberId = parseInt(req.params.id, 10);
    db.barbers = db.barbers.filter(b => b.id !== barberId);
    db.users = db.users.filter(u => u.id !== barberId);
    res.status(204).send();
});

// APPOINTMENTS
app.get('/api/appointments', (req, res) => {
    res.json(db.appointments);
});

app.get('/api/appointments/barber/:barberId', (req, res) => {
    const barberId = parseInt(req.params.barberId, 10);
    const appointments = db.appointments.filter(a => a.barber.id === barberId);
    res.json(appointments);
});

app.get('/api/appointments/client/:clientId', (req, res) => {
    const clientId = parseInt(req.params.clientId, 10);
    const appointments = db.appointments.filter(a => a.clientId === clientId);
    res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
    const newAppointmentData = req.body;
    const newAppointment = {
      ...newAppointmentData,
      id: `apt-${Date.now()}`,
    }
    db.appointments.push(newAppointment);
    res.status(201).json(newAppointment);
});

app.put('/api/appointments/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const appIndex = db.appointments.findIndex(a => a.id === id);
    if (appIndex !== -1) {
        db.appointments[appIndex].status = status;
        res.json(db.appointments[appIndex]);
    } else {
        res.status(404).json({ message: 'Cita no encontrada' });
    }
});

// GEMINI SERVICE
app.post('/api/appointments/:id/generate-confirmation', async (req, res) => {
    const { id } = req.params;
    const appointment = db.appointments.find(a => a.id === id);

    if (!appointment) {
        return res.status(404).json({ message: 'Cita no encontrada' });
    }

    const fallbackMessage = `¡Tu cita está confirmada, ${appointment.clientName}! Te esperamos el ${new Date(appointment.date).toLocaleDateString('es-ES', { dateStyle: 'long' })} a las ${appointment.time} para tu servicio de ${appointment.service.name} con ${appointment.barber.name}. ¡Nos vemos!`;
    
    if (!ai) {
        return res.json({ message: fallbackMessage });
    }

    const { service, barber, date, time, clientName } = appointment;
    const formattedDate = new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const prompt = `
      Eres un asistente virtual muy amigable y con estilo para una barbería de alta gama llamada "Barba Store".
      Tu tarea es escribir un mensaje de confirmación de cita para un cliente. El tono debe ser genial, moderno y acogedor.
      Detalles de la cita:
      - Nombre del cliente: ${clientName}
      - Servicio: ${service.name}
      - Barbero: ${barber.name}
      - Fecha: ${formattedDate}
      - Hora: ${time}
      Instrucciones para el mensaje:
      1. Dirígete al cliente por su nombre.
      2. Confirma todos los detalles de la cita de manera clara y concisa.
      3. Añade una frase que genere expectación, como "Prepárate para lucir increíble" o algo similar.
      4. Recuérdale amablemente que llegue 5 minutos antes para una experiencia relajada.
      5. Finaliza con un saludo cordial de parte de "Barba Store".
      Genera solo el texto del mensaje, sin títulos ni encabezados adicionales.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-04-17",
            contents: prompt,
        });
        res.json({ message: response.text.trim() });
    } catch (error) {
        console.error("Gemini API call failed:", error);
        res.status(500).json({ message: fallbackMessage });
    }
});


// --- START SERVER ---
app.listen(port, async () => {
    await hashInitialPasswords();
    console.log(`Barba Store backend listening on http://localhost:${port}`);
});
