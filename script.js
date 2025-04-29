const ADMIN_PASSWORD = 'admin123';

const adminPanel = document.getElementById('admin-panel');

window.onload = async () => {
    try {
        const response = await fetch('/check-auth');
        const data = await response.json();

        if (data.isAdmin) {
            adminPanel.style.display = 'block';
            document.getElementById('main-login').style.display = 'none';
            document.getElementById('admin-login').style.display = 'none';
            loadAllUsers();
        } else if (data.loggedInUser) {
            document.getElementById('main-login').style.display = 'none';
            document.getElementById('user-panel').style.display = 'block';
            document.getElementById('welcomeUsername').textContent = data.loggedInUser;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
};

function toggleAdmin() {
    const mainLogin = document.getElementById('main-login');
    const adminLogin = document.getElementById('admin-login');

    if (adminLogin.style.display === 'none') {
        adminLogin.style.display = 'block';
        mainLogin.style.display = 'none';
        adminPanel.style.display = 'none';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminMessage').textContent = '';
    } else {
        adminLogin.style.display = 'none';
        mainLogin.style.display = 'block';
        adminPanel.style.display = 'none';
    }
}

function showRegisterForm() {
    document.getElementById('main-login').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerMessage').textContent = '';
}

function showLoginForm() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('main-login').style.display = 'block';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('message').textContent = '';
}

function togglePassword(inputId) {
    const inputField = document.getElementById(inputId);
    inputField.type = inputField.type === 'password' ? 'text' : 'password';
}

async function registerUser() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const messageElement = document.getElementById('registerMessage');

    if (!username || !email || !password) {
        messageElement.textContent = 'Täytä kaikki kentät!';
        messageElement.style.color = '#ff6b6b';
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });

        const result = await response.text();
        if (response.ok) {
            messageElement.textContent = result;
            messageElement.style.color = '#4BB543';
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
        } else {
            throw new Error(result);
        }
    } catch (error) {
        messageElement.textContent = error.message;
        messageElement.style.color = '#ff6b6b';
    }
}

async function loginUser() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageElement = document.getElementById('message');

    if (!username || !password) {
        messageElement.textContent = 'Täytä kaikki kentät!';
        messageElement.style.color = '#ff6b6b';
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.text();
        if (response.ok) {
            messageElement.textContent = result;
            messageElement.style.color = '#4BB543';
            document.getElementById('main-login').style.display = 'none';
            document.getElementById('user-panel').style.display = 'block';
            document.getElementById('welcomeUsername').textContent = username;
        } else {
            throw new Error(result);
        }
    } catch (error) {
        messageElement.textContent = error.message;
        messageElement.style.color = '#ff6b6b';
    }
}

async function logoutUser() {
    try {
        await fetch('/logout', { method: 'POST' });
        document.getElementById('user-panel').style.display = 'none';
        document.getElementById('main-login').style.display = 'block';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('message').textContent = '';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

async function checkAdminPassword() {
    const enteredPassword = document.getElementById('adminPassword').value;
    const messageElement = document.getElementById('adminMessage');

    if (enteredPassword === ADMIN_PASSWORD) {
        try {
            await fetch('/admin-login', { method: 'POST' });
            document.getElementById('admin-login').style.display = 'none';
            adminPanel.style.display = 'block';
            loadAllUsers();
        } catch (error) {
            messageElement.textContent = 'Admin kirjautuminen epäonnistui';
            messageElement.style.color = '#ff6b6b';
        }
    } else {
        messageElement.textContent = 'Väärä salasana! Yritä uudelleen.';
        messageElement.style.color = '#ff6b6b';
    }
}

async function logoutAdmin() {
    try {
        await fetch('/admin-logout', { method: 'POST' });
        adminPanel.style.display = 'none';
        document.getElementById('main-login').style.display = 'block';
    } catch (error) {
        console.error('Admin logout failed:', error);
    }
}

async function loadAllUsers() {
    try {
        const response = await fetch('/users');
        const users = await response.json();
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';

        if (Object.keys(users).length === 0) {
            usersList.innerHTML = "<tr><td colspan='3'>Ei rekisteröityneitä käyttäjiä</td></tr>";
        } else {
            for (const [username, userData] of Object.entries(users)) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${username}</td>
                    <td>${userData.email}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="editUser('${username}')">Muokkaa</button>
                        <button class="action-btn delete-btn" onclick="deleteUser('${username}')">Poista</button>
                    </td>
                `;
                usersList.appendChild(row);
            }
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function filterUsers() {
    const input = document.getElementById('searchUsers').value.toLowerCase();
    const rows = document.querySelectorAll('#usersList tr');

    rows.forEach(row => {
        const username = row.cells[0].textContent.toLowerCase();
        const email = row.cells[1].textContent.toLowerCase();
        row.style.display = username.includes(input) || email.includes(input) ? '' : 'none';
    });
}

async function deleteUser(username) {
    if (confirm(`Haluatko varmasti poistaa käyttäjän ${username}?`)) {
        try {
            await fetch(`/users/${username}`, { method: 'DELETE' });
            loadAllUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    }
}

async function editUser(username) {
    const newEmail = prompt('Uusi sähköposti:');
    if (newEmail !== null) {
        try {
            await fetch(`/users/${username}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            });
            loadAllUsers();
        } catch (error) {
            console.error('Failed to update user:', error);
        }
    }
}