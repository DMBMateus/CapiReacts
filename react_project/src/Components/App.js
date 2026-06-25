import BACKEND_URL from '../config';
import '../Components_CSS/App.css';
import {ThemeProvider, createTheme, CssBaseline, Button, TextField} from '@mui/material';
import { createContext, useState, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Drawer } from '@mui/material';

import Navbar from "./NavBar/NavBar";
import Posts from "./Posts/Posts";
import Profile from "./NavBar/Profile";
import Friends from "./Friends/Friends";
import Banner from "./Banner/Banner";
import AddFriend from "./Friends/AddFriend";
import NewPost from "./Posts/NewPost";
import capi_body from "../Assets/capi_friends.png"
import capi_arm from "../Assets/capi_arm.png"

export const ThemeContext = createContext();
export const FriendContext = createContext();
export const ProfileContext = createContext();

function LoginPage({ onLogin }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!name.trim() || !email.trim()) {
            setError('Please enter your name and email.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            // Check if user with this email already exists
            const res = await fetch(`${BACKEND_URL}/api/users`);
            const users = await res.json();
            const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (existing) {
                // User exists → log in
                onLogin(String(existing.id));
            } else {
                // User doesn't exist → register
                const createRes = await fetch(`${BACKEND_URL}/api/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, online: true }),
                });
                const newUser = await createRes.json();
                if (newUser.id) {
                    onLogin(String(newUser.id));
                } else {
                    setError('Failed to create user. Try again.');
                }
            }
        } catch (err) {
            setError('Could not connect to server. Try again.');
        }
        setLoading(false);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: '1rem',
        }}>
            <h1>Welcome to CapiReacts</h1>
            <p style={{ color: '#666' }}>Enter your details to log in or register</p>
            <TextField
                label="Name"
                variant="outlined"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '300px' }}
            />
            <TextField
                label="Email"
                variant="outlined"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '300px' }}
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <Button
                variant="contained"
                onClick={handleLogin}
                disabled={loading}
                style={{ width: '300px' }}
            >
                {loading ? 'Loading...' : 'Login / Register'}
            </Button>
        </div>
    );
}

function LandingPage({ onBannerClick }) {
    return (
        <div className="container-app">
            <div className="left-div">
                <NewPost />
                <Friends />
            </div>
            <Posts />
            <div className="wrapper_img" onClick={onBannerClick}>
                <Banner />
            </div>
        </div>
    );
}

function FriendsPage() {
    return (
        <div className="container">
            <AddFriend />
            <img className="capi-addFriends-body" src={capi_body} alt="Capi animation"/>
            <img className="capi-addFriends-arm" src={capi_arm} alt="Capi waving arm"/>
        </div>
    );
}

function App() {
    const navigate = useNavigate();

    const [mode, setMode] = useState('light');
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [showRemoveFriendButton, setShowRemoveFriendButton] = useState(true);
    const [profile, setProfile] = useState(null); // ← null until logged in
    const [friendsList, setFriendsList] = useState([]);
    const [phase, setPhase] = useState('idle');

    const handleLogin = (userId) => {
        setProfile(userId);
    };

    const handleBannerClick = () => {
        if (phase !== 'idle') return;
        setPhase('expanding');
        setTimeout(() => {
            navigate('/friends');
            setPhase('shrinking');
        }, 1000);
    };

    const handleTransitionEnd = () => {
        if (phase === 'shrinking') setPhase('idle');
    };

    const removeFriend = (friendId) => {
        fetch(`${BACKEND_URL}/api/users/${profile}/friends/${friendId}`, {
            method: 'DELETE',
        })
            .then(res => res.json())
            .then(data => {
                if (data.message === 'Friendship removed') {
                    setFriendsList(prev => prev.filter(f => f.id !== friendId));
                    closeFriendDrawer();
                } else {
                    console.error('Failed to remove friend:', data.error);
                }
            })
            .catch(err => console.error('Failed to remove friend:', err));
    };

    const toggleTheme = () => setMode(prev => prev === 'light' ? 'dark' : 'light');
    const openFriendDrawer = (friend, options = { showRemoveButton: true }) => {
        setSelectedFriend(friend);
        setShowRemoveFriendButton(options.showRemoveButton);
    };
    const closeFriendDrawer = () => setSelectedFriend(null);
    const currentProfile = userId => setProfile(userId);

    const theme = useMemo(
        () => createTheme({
            palette: {
                primary: { main: mode === 'light' ? '#BFDBF7' : '#053C5E' },
                secondary: { main: mode === 'light' ? '#353839' : '#FFFFFF' },
                mode,
            },
            typography: { fontFamily: 'Roboto, sans-serif' },
        }),
        [mode]
    );

    // Show login page if not logged in
    if (!profile) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <LoginPage onLogin={handleLogin} />
            </ThemeProvider>
        );
    }

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <FriendContext.Provider value={{ openFriendDrawer, friendsList, setFriendsList }}>
                <ProfileContext.Provider value={{ profile, currentProfile }}>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        <Navbar />

                        <Routes>
                            <Route path="/" element={<LandingPage onBannerClick={handleBannerClick} />} />
                            <Route path="/friends" element={<FriendsPage />} />
                        </Routes>

                        {phase !== 'idle' && (
                            <div className={`transition-overlay ${phase}`} onAnimationEnd={handleTransitionEnd}>
                                <Banner />
                            </div>
                        )}

                        <Drawer anchor="right" open={Boolean(selectedFriend)} onClose={closeFriendDrawer}>
                            <div className="drawer-content">
                                {selectedFriend && (
                                    <>
                                        <Profile
                                            name={selectedFriend.name}
                                            email={selectedFriend.email}
                                            phone={selectedFriend.phone}
                                            gender={selectedFriend.gender}
                                            online={selectedFriend.online}
                                            profile_picture={selectedFriend.profile_picture}
                                            id={selectedFriend.id}
                                        />
                                        {showRemoveFriendButton && (
                                            <Button
                                                variant="contained"
                                                color="error"
                                                onClick={() => removeFriend(selectedFriend.id)}
                                                style={{ marginTop: '1rem', width: '100%' }}
                                            >
                                                Remove Friend
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </Drawer>
                    </ThemeProvider>
                </ProfileContext.Provider>
            </FriendContext.Provider>
        </ThemeContext.Provider>
    );
}

export default App;