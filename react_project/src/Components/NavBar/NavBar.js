import {useState, useEffect, useContext} from 'react';
import { Link } from 'react-router-dom';
import { Drawer, Menu, MenuItem } from '@mui/material';
import Profile from "./Profile";
import Settings from "./Settings";
import '../../Components_CSS/NavBar.css';
import home_icon from "../../Assets/capi.png";
import capi_name from "../../Assets/capi_name.png";
import user_icon from "../../Assets/user_icon.png";
import {ProfileContext} from "../App";

function Navbar() {
    const [anchorEl, setAnchorEl] = useState(null);
    const [activeDrawer, setActiveDrawer] = useState(null);
    const [currentUser, setCurrentUser] = useState(null); // ← stores the logged-in user's data

    const { profile } = useContext(ProfileContext);


    // Fetch the user data once when Navbar mounts
    useEffect(() => {
        fetch('http://localhost:5000/api/users/' + profile) // ← replace 1 with the actual logged-in user's id
            .then(res => res.json())
            .then(data => setCurrentUser(data))
            .catch(err => console.error('Failed to fetch user:', err));
    }, [profile]);

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const openDrawer = (drawer) => {
        setActiveDrawer(drawer);
        handleMenuClose();
    }
    const closeDrawer = () => setActiveDrawer(null);

    return (
        <>
            <nav className="nav" >
                <Link to="/" className="nav-item">
                    <div className="logo-wrapper">
                        <img className="home-img" src={home_icon} alt="Home Icon"/>
                        <img className="capi-name-img" src={capi_name} alt="Capi Reacts"/>
                    </div>
                </Link>
                <img
                    className="nav-item nav-item-right profile-img option"
                    src={
                        currentUser && currentUser.profile_picture
                            ? (currentUser.profile_picture.startsWith('http') ? currentUser.profile_picture : `http://localhost:5000${currentUser.profile_picture}`)
                            : user_icon
                    }
                    onClick={handleMenuOpen}
                    alt="Profile Icon"
                />
            </nav>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={() => openDrawer("profile")}>View Profile</MenuItem>
                <MenuItem onClick={() => openDrawer("settings")}>Settings</MenuItem>
                <MenuItem onClick={handleMenuClose}>Logout</MenuItem>
            </Menu>

            {/* Profile Drawer */}
            <Drawer anchor="right" open={activeDrawer === "profile"} onClose={closeDrawer}>
                <div className="drawer-content">
                    {currentUser && (
                        <Profile className={"option"}
                            id={currentUser.id}
                            name={currentUser.name}
                            email={currentUser.email}
                            phone={currentUser.phone}
                            gender={currentUser.gender}
                            profile_picture={currentUser.profile_picture}
                        />
                    )}
                </div>
            </Drawer>

            <Drawer anchor="right" open={activeDrawer === "settings"} onClose={closeDrawer}>
                <div className="drawer-content">
                    <Settings />
                </div>
            </Drawer>
        </>
    );
}

export default Navbar;