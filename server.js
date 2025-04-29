require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const crypto = require('crypto');
const app = express();
const PORT = 3000;
const encryptionKey = process.env.ENCRYPTION_KEY;
console.log("Encryption Key:", encryptionKey);

// Salausasetukset
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // ⚠️  Store this securely!
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY) {
    console.error('ERROR: ENCRYPTION_KEY is not defined in .env!');
    process.exit(1); // Exit if the key is missing
}

function encryptEmail(email) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        iv
    );  // Use Buffer for the key
    let encrypted = cipher.update(email, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decryptEmail(encryptedEmail) {
    try {
        const parts = encryptedEmail.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(ENCRYPTION_KEY, 'hex'),
            iv
        );  // Use Buffer for the key
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted.toString();
    } catch (error) {
        console.error('Decryption error:', error);
        return null; // Or throw an error, depending on your needs
    }
}

// Session setup
app.use(
    session({
        secret: 'your-secret-key', // Replace with a strong, random key
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set to true in production if using HTTPS
    })
);

app.use(express.static(__dirname));
app.use(express.json());

const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware admin-tilan tarkistamiseen
function isAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('Ei admin-oikeuksia');
    }
}

// Lataa käyttäjät tiedostosta
function loadUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        return {};
    }
}

// Tallenna käyttäjät tiedostoon
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// Tarkista todennus
app.get('/check-auth', (req, res) => {
    res.json({
        loggedInUser: req.session.loggedInUser,
        isAdmin: req.session.isAdmin,
    });
});

// Käyttäjän rekisteröinti
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).send('Täytä kaikki kentät!');
    }

    const users = loadUsers();
    if (users[username]) {
        return res.status(400).send('Käyttäjätunnus on jo käytössä!');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const encryptedEmail = encryptEmail(email); // Salaa sähköposti
    users[username] = { email: encryptedEmail, password: hashedPassword };
    saveUsers(users);
    res.send('Rekisteröinti onnistui!');
});

// Käyttäjän sisäänkirjautuminen
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();

    if (!users[username]) {
        return res.status(400).send('Käyttäjää ei löydy!');
    }

    if (bcrypt.compareSync(password, users[username].password)) {
        req.session.loggedInUser = username;
        res.send('Kirjautuminen onnistui!');
    } else {
        res.status(400).send('Väärä salasana!');
    }
});

// Käyttäjän uloskirjautuminen
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.sendStatus(200);
});

// Admin sisäänkirjautuminen
app.post('/admin-login', (req, res) => {
    req.session.isAdmin = true;
    res.sendStatus(200);
});

// Admin uloskirjautuminen
app.post('/admin-logout', (req, res) => {
    req.session.isAdmin = false;
    res.sendStatus(200);
});

// Hae kaikki käyttäjät (vain admin)
app.get('/users', isAdmin, (req, res) => {
    const users = loadUsers();
    const filteredUsers = {};
    for (const username in users) {
        const decryptedEmail = decryptEmail(users[username].email);
        if (decryptedEmail) { // Only add if decryption was successful
            filteredUsers[username] = { email: decryptedEmail };
        } else {
            console.warn(`Could not decrypt email for user: ${username}`);
            // Optionally, you might want to handle this case differently,
            // such as skipping the user or returning an error to the client.
        }
    }
    res.json(filteredUsers);
});

// Poista käyttäjä (vain admin)
app.delete('/users/:username', isAdmin, (req, res) => {
    const { username } = req.params;
    const users = loadUsers();
    delete users[username];
    saveUsers(users);
    res.send('Käyttäjä poistettu!');
});

// Päivitä käyttäjä (vain admin)
app.put('/users/:username', isAdmin, (req, res) => {
    const { username } = req.params;
    const { email } = req.body;
    const users = loadUsers();

    if (!users[username]) {
        return res.status(404).send('Käyttäjää ei löydy!');
    }

    users[username].email = encryptEmail(email); // Salaa päivitetty sähköposti
    saveUsers(users);
    res.send('Sähköposti päivitetty!');
});

app.listen(PORT, () => {
    console.log(`Palvelin käynnissä osoitteessa http://localhost:${PORT}`);
});