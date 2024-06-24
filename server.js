const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const methodOverride = require('method-override');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: 'https://66799b790b935c08972014e3--guileless-donut-85ffb0.netlify.app',
  credentials: true // Allow cookies with CORS
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_DB_URI }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none' // Adjust as needed
  }
}));
app.use(methodOverride('_method')); // Enable method override

// MongoDB Connection
const mongoURI = process.env.MONGO_DB_URI;
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema and Routes
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

app.post('/signup', async (req, res, next) => {
  const { email, username, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).send('Email or username already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, username, password: hashedPassword });
    await newUser.save();
    res.status(201).send('Signup successful');
  } catch (err) {
    next(err); // Pass error to the error handling middleware
  }
});

app.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send('Invalid username or password');
    }
    req.session.user = user;
    res.status(200).send('Login successful');
  } catch (err) {
    next(err); // Pass error to the error handling middleware
  }
});

app.get('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) {
      return next(err); // Pass error to the error handling middleware
    }
    res.clearCookie('connect.sid');
    res.status(200).send('Logout successful');
  });
});

// Middleware to check if the user is authenticated
function checkAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
}

// Example protected route
app.get('/protected', checkAuth, (req, res) => {
  res.status(200).send('You are authenticated');
});

// Package Schemas and Routes
const flightSchema = new mongoose.Schema({
  details: String,
  flightNumber: String,
  departureDate: Date,
  returnDate: Date
});

const hotelSchema = new mongoose.Schema({
  details: String,
  name: String,
  address: String,
  checkIn: Date,
  checkOut: Date,
  bookingDetails: String
});

const policySchema = new mongoose.Schema({
  title: String,
  description: String
});

const itineraryDaySchema = new mongoose.Schema({
  day: Number,
  date: Date,
  hotel: String,
  hotelStars: String,
  car: String,
  sightseeing: String
});

const activitySchema = new mongoose.Schema({
  name: String,
  img: String,
  description: String
});

const packageSchema = new mongoose.Schema({
  destination: String,
  name: String,
  duration: String,
  flights: flightSchema,
  hotels: hotelSchema,
  transfers: String,
  activities: [activitySchema],
  meals: String,
  price: String,
  img: String,
  imgUrls: [String],
  policies: [policySchema],
  itinerary: [itineraryDaySchema]
});
const Package = mongoose.model('Package', packageSchema);

// Routes for packages
app.get('/api/packages/:destination', async (req, res, next) => {
  const { destination } = req.params;
  try {
    const packages = await Package.find({ destination });
    res.json(packages);
  } catch (err) {
    next(err); // Pass error to the error handling middleware
  }
});

app.get('/api/package/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const package = await Package.findById(id);
    if (!package) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json(package);
  } catch (err) {
    next(err); // Pass error to the error handling middleware
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
