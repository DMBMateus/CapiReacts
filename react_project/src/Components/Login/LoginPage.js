import BACKEND_URL from '../../config';
import { useState } from 'react';
import { Button, TextField, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

function LoginPage({ onLogin }) {
    const [tab, setTab] = useState('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    const isValidPhone = (val) => /^\+?[\d\s\-().]{7,15}$/.test(val);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${BACKEND_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.id) {
                onLogin(String(data.id));
            } else {
                setError(data.error || 'Invalid email or password.');
            }
        } catch {
            setError('Could not connect to server. Try again.');
        }
        setLoading(false);
    };

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('Please enter at least your name, email and password.');
            return;
        }
        if (!isValidEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (phone.trim() && !isValidPhone(phone)) {
            setError('Please enter a valid phone number.');
            return;
        }
        if (password.length < 5) {
            setError('Password must be at least 5 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${BACKEND_URL}/api/users`);
            const users = await res.json();
            const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (existing) {
                setError('An account with this email already exists. Please log in.');
                setLoading(false);
                return;
            }
            const createRes = await fetch(`${BACKEND_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    phone: phone.trim() || null,
                    gender: gender || null,
                    online: true,
                }),
            });
            const newUser = await createRes.json();
            if (newUser.id) {
                onLogin(String(newUser.id));
            } else {
                setError('Failed to create account. Try again.');
            }
        } catch {
            setError('Could not connect to server. Try again.');
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100vh', gap: '1rem',
        }}>
            <h1>Welcome to CapiReacts</h1>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                    variant={tab === 'login' ? 'contained' : 'outlined'}
                    onClick={() => { setTab('login'); setError(''); setPassword(''); setConfirmPassword(''); }}
                >
                    Log in
                </Button>
                <Button
                    variant={tab === 'register' ? 'contained' : 'outlined'}
                    onClick={() => { setTab('register'); setError(''); setPassword(''); setConfirmPassword(''); }}
                >
                    Register
                </Button>
            </div>

            {tab === 'login' && (
                <>
                    <TextField
                        label="Email" variant="outlined" value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ width: '300px' }}
                    />
                    <TextField
                        label="Password" variant="outlined" type="password" value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: '300px' }}
                    />
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <Button variant="contained" onClick={handleLogin}
                            disabled={loading} style={{ width: '300px' }}>
                        {loading ? 'Loading...' : 'Log in'}
                    </Button>
                </>
            )}

            {tab === 'register' && (
                <>
                    <TextField
                        label="Name" variant="outlined" value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ width: '300px' }}
                    />
                    <TextField
                        label="Email" variant="outlined" value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ width: '300px' }}
                    />
                    <TextField
                        label="Password" variant="outlined" type="password" value={password}
                        onChange={e => setPassword(e.target.value)}
                        style={{ width: '300px' }}
                    />
                    <TextField
                        label="Confirm Password" variant="outlined" type="password" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        style={{ width: '300px' }}
                    />
                    <TextField
                        label="Phone (optional)" variant="outlined" value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{ width: '300px' }}
                    />
                    <FormControl variant="outlined" style={{ width: '300px' }}>
                        <InputLabel>Gender (optional)</InputLabel>
                        <Select
                            value={gender}
                            onChange={e => setGender(e.target.value)}
                            label="Gender (optional)"
                            variant={"outlined"}>
                            <MenuItem value="">Select gender...</MenuItem>
                            <MenuItem value="Male">Male</MenuItem>
                            <MenuItem value="Female">Female</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    <Button variant="contained" onClick={handleRegister}
                            disabled={loading} style={{ width: '300px' }}>
                        {loading ? 'Loading...' : 'Register'}
                    </Button>
                </>
            )}
        </div>
    );
}

export default LoginPage;