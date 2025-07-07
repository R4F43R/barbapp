    1     -- Tabla de Usuarios
    2     CREATE TABLE users (
    3         id SERIAL PRIMARY KEY,
    4         name VARCHAR(255) NOT NULL,
    5         email VARCHAR(255) UNIQUE NOT NULL,
    6         password_hash VARCHAR(255) NOT NULL,
    7         role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'barber', 'admin'))
    8     );
    9
   10     -- Tabla de Barberos (perfil extendido)
   11     CREATE TABLE barbers (
   12         id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
   13         specialty VARCHAR(255),
   14         image_url VARCHAR(255)
   15     );
   16
   17     -- Tabla de Servicios
   18     CREATE TABLE services (
   19         id SERIAL PRIMARY KEY,
   20         name VARCHAR(255) NOT NULL,
   21         description TEXT,
   22         price NUMERIC(10, 2) NOT NULL,
   23         duration INT NOT NULL -- en minutos
   24     );
   25
   26     -- Tabla de Citas
   27     CREATE TABLE appointments (
   28         id VARCHAR(255) PRIMARY KEY,
   29         client_id INT REFERENCES users(id),
   30         barber_id INT REFERENCES barbers(id),
   31         service_id INT REFERENCES services(id),
   32         date DATE NOT NULL,
   33         time VARCHAR(5) NOT NULL,
   34         client_name VARCHAR(255),
   35         client_phone VARCHAR(50),
   36         status VARCHAR(50) NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'pending',
      'rejected'))
   37     );
   38
   39     -- Insertar los servicios iniciales
   40     INSERT INTO services (name, description, price, duration) VALUES
   41     ('Corte de Cabello Clásico', 'Un corte de precisión adaptado a tu estilo, finalizado con un
      peinado profesional.', 25.00, 30),
   42     ('Afeitado con Toalla Caliente', 'La experiencia de afeitado definitiva con navaja, aceites
      y toallas calientes.', 30.00, 45),
   43     ('Arreglo de Barba', 'Define y dale forma a tu barba con un recorte experto, perfilado y
      aceite para barba.', 20.00, 30),
   44     ('Paquete Completo', 'El servicio premium: corte de cabello, arreglo de barba y afeitado
      con toalla caliente.', 65.00, 75);
   45
   46     -- Opcional: Insertar un usuario administrador
   47     -- Recuerda cambiar la contraseña por un hash bcrypt válido si lo haces manualmente.
   48     -- Por ejemplo, un hash para 'admin123'
   49     INSERT INTO users (name, email, password_hash, role) VALUES
   50     ('Admin', 'admin@barbastore.com', '$2b$10$examplebcryptstring...', 'admin');