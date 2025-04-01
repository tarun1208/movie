const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, set } = require('firebase/database');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');

dotenv.config();

// Initialize Firebase
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

// Express app setup
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// Register user
app.post('/register', async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST for registration.' });
    }
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        set(ref(db, 'users/' + user.uid), {
            email: user.email
        });
        res.status(201).json({ message: 'User registered successfully', user: { uid: user.uid, email: user.email } });
    } catch (error) {
        console.error('Error registering user:', error);
        let errorMessage = 'Registration failed';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email address is already in use.';
        }
        res.status(400).json({ error: errorMessage });
    }
});

// Login user
app.post('/login', async (req, res) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1]; // Extract token
    if (!idToken) {
        return res.status(401).json({ error: "Unauthorized. No token provided." });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken); // Verify token
        const user = await admin.auth().getUser(decodedToken.uid);

        res.json({
            message: "Logged in successfully",
            user: {
                uid: user.uid,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Error verifying token:", error);
        res.status(401).json({ error: "Invalid authentication token." });
    }
});


// Movie search functionality using OMDB API
app.get('/movie/:title', async (req, res) => {
    const title = req.params.title;
    const apiKey = process.env.OMDB_API_KEY;
    const apiUrl = `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${apiKey}`;

    try {
        const response = await axios.get(apiUrl);
        const data = response.data;
        
        if (data.Response === "False") {
            res.status(404).json({ error: 'Movie not found' });
        } else {
            res.json({
                title: data.Title,
                releaseDate: data.Released,
                imdbRating: data.imdbRating,
                language: data.Language,
                genre: data.Genre,
                actors: data.Actors,
                poster: data.Poster
            });
        }
    } catch (error) {
        console.error('Error fetching movie details:', error);
        res.status(500).json({ error: 'Failed to fetch movie details' });
    }
});

// Listen to requests on the specified port
const PORT = 5500;
app.listen(PORT, () => {
    console.log(`Server running at http://127.0.0.1:${PORT}`);
});

// Registration
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});


