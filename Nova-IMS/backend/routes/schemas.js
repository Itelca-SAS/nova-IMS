const text = (max, extra = {}) => ({ type: 'text', max, ...extra });
const required = (max) => text(max, { required: true });

const personName = {
  primerNombre: text(50),
  segundoNombre: text(50),
  primerApellido: text(50),
  segundoApellido: text(50),
};

module.exports = {
  login: {
    agencia: required(10),
    usuario: required(150),
    password: required(128),
    rol: text(50),
    rememberMe: { type: 'bool' },
  },
  verifyOtp: {
    userId: required(150),
    code: required(10),
    agencia: text(10),
  },
  forgotPassword: {
    agencia: required(10),
    usuario: required(150),
  },
  resetPassword: {
    userId: required(150),
    agencia: required(10),
    code: required(10),
    newPassword: required(128),
  },
  changePassword: {
    currentPassword: required(128),
    newPassword: required(128),
  },
  changePasswordWithCredentials: {
    agencia: required(10),
    usuario: required(150),
    currentPassword: required(128),
    newPassword: required(128),
  },
  incident: {
    location: text(200),
    phone: text(50),
    ani: text(50),
    locationPhoneNumber: text(50),
    involvedPeople: { type: 'array' },
    involvedPlaces: { type: 'array' },
    involvedVehicles: { type: 'array' },
  },
  person: {
    ...personName,
    contacto: text(100),
    phone: text(100),
    documentId: text(30),
    numeroDocumento: text(30),
    comentarios: text(500),
    notes: text(500),
  },
  operator: {
    ...personName,
    email: text(100),
    telefono: text(20),
    username: text(20),
    password: text(128),
    role: text(50),
    status: text(20),
  },
  notificationEmail: {
    email: required(150),
  },
  locationRequest: {
    phone: required(30),
    channel: text(10, { required: true, oneOf: ['whatsapp', 'sms'] }),
    incident_id: text(20),
  },
  role: {
    role: text(50),
    name: text(50),
  },
};
