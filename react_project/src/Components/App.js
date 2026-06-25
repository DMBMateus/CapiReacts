import '../Components_CSS/App.css';
import {ThemeProvider, createTheme, CssBaseline, Button} from '@mui/material';
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
    const [profile, setProfile] = useState("4");
    const [friendsList, setFriendsList] = useState([]); // ← moved here from Friends.js
    const [phase, setPhase] = useState('idle');

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
        fetch(`http://localhost:5000/api/users/${profile}/friends/${friendId}`, {
            method: 'DELETE',
        })
            .then(res => res.json())
            .then(data => {
                if (data.message === 'Friendship removed') {
                    setFriendsList(prev => prev.filter(f => f.id !== friendId)); // ← remove instantly
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

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <FriendContext.Provider value={{ openFriendDrawer, friendsList, setFriendsList }}> {/* ← add friendsList here */}
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