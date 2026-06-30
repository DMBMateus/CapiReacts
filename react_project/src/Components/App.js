import BACKEND_URL from '../config';
import '../Components_CSS/App.css';
import {ThemeProvider, createTheme, CssBaseline, Button} from '@mui/material';
import {createContext, useState, useMemo, useEffect} from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Drawer } from '@mui/material';

import Navbar from "./NavBar/NavBar";
import Posts from "./Posts/Posts";
import Profile from "./NavBar/Profile";
import Friends from "./Friends/Friends";
import Banner from "./Banner/Banner";
import AddFriend from "./Friends/AddFriend";
import NewPost from "./Posts/NewPost";
import LoginPage from "./Login/LoginPage";
import capi_body from "../Assets/capi_friends.png"
import capi_arm from "../Assets/capi_arm.png"

export const ThemeContext = createContext();
export const FriendContext = createContext();
export const ProfileContext = createContext();

function LandingPage({ onBannerClick }) {
    const [onPostCreated, setOnPostCreated] = useState(null);

    return (
        <div className="container-app">
            <div className="left-div">
                <NewPost onPostCreated={onPostCreated} />
                <Friends />
            </div>
            <Posts onRegisterPostCreated={setOnPostCreated} />
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

const SESSION_DURATION = 5 * 60 * 1000; // 5 minutes in ms

function getStoredProfile() {
    const stored = localStorage.getItem('session');
    if (!stored) return null;

    try {
        const { userId, timestamp } = JSON.parse(stored);
        const isExpired = Date.now() - timestamp > SESSION_DURATION;
        if (isExpired) {
            localStorage.removeItem('session');
            return null;
        }
        return userId;
    } catch {
        return null;
    }
}

function setOnlineStatus(userId, online) {
    fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online }),
    }).catch(err => console.error('Failed to set online status:', err));
}

function App() {
    const navigate = useNavigate();

    const [mode, setMode] = useState('light');
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [showRemoveFriendButton, setShowRemoveFriendButton] = useState(true);
    const [profile, setProfile] = useState(getStoredProfile);
    const [friendsList, setFriendsList] = useState([]);
    const [phase, setPhase] = useState('idle');

    const handleLogin = (userId) => {
        setProfile(userId);
        localStorage.setItem('session', JSON.stringify({ userId, timestamp: Date.now() }));
        setOnlineStatus(userId, true);
    };

    // Re-mark as online if a valid session was restored from storage on page load/refresh
    useEffect(() => {
        if (profile) {
            setOnlineStatus(profile, true);
        }
    }, []); // intentionally empty — only checks the initial profile value from mount

    useEffect(() => {
        if (!profile) return;

        const handleUnload = () => {
            navigator.sendBeacon(`${BACKEND_URL}/api/users/${profile}/offline`);
        };

        window.addEventListener('pagehide', handleUnload);
        return () => window.removeEventListener('pagehide', handleUnload);
    }, [profile]);

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