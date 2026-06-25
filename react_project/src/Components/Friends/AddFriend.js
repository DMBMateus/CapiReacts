import BACKEND_URL from '../../config';
import {useEffect, useState, useContext} from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import {useTheme} from "@mui/material/styles";
import {Button} from "@mui/material";
import {AddBox} from "@mui/icons-material";
import '../../Components_CSS/AddFriend.css';
import SingleFriend from "./SingleFriend";
import {ProfileContext} from "../App";

function Users({ search }) { // ← receive search prop
    const [usersList, setUsersList] = useState([]);
    const [friendsList, setFriendsList] = useState([]);
    const { profile } = useContext(ProfileContext);
    const theme = useTheme();

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/users`)
            .then(res => res.json())
            .then(data => setUsersList(data))
            .catch(err => console.error('Failed to fetch users:', err));

        fetch(`${BACKEND_URL}/api/users/${profile}/friends`)
            .then(res => res.json())
            .then(data => setFriendsList(data))
            .catch(err => console.error('Failed to fetch friends:', err));
    }, [profile]);

    const filteredUsers = usersList
        .filter(user => {
            const isCurrentUser = user.id === parseInt(profile);
            const isAlreadyFriend = friendsList.some(friend => friend.id === user.id);
            return !isCurrentUser && !isAlreadyFriend;
        })
        .filter(user =>
            user.name.toLowerCase().includes(search.toLowerCase()) // ← filter by search
        );

    const handleAddFriend = (friendId) => {
        fetch(`${BACKEND_URL}/api/users/${profile}/friends`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId: friendId }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.message === 'Friendship created') {
                    // Add to friendsList so they disappear immediately
                    const newFriend = usersList.find(u => u.id === friendId);
                    setFriendsList(prev => [...prev, newFriend]);
                } else {
                    console.error('Failed to add friend:', data.error);
                }
            })
            .catch(err => console.error('Failed to add friend:', err));
    };

    return (
        <div className="friends_add" style={{ background: theme.palette.primary.main }}>
            {filteredUsers.length === 0 &&
                <h2>No users to add</h2>
            }
                {filteredUsers.map(user => (
                    <div key={user.id} className="container">
                        <SingleFriend
                            id={user.id}
                            name={user.name}
                            online={user.online}
                            email={user.email}
                            phone={user.phone}
                            gender={user.gender}
                            profile_picture={user.profile_picture}
                        />
                        <Button
                            className="button_friend"
                            variant="contained"
                            startIcon={<AddBox />}
                            onClick={() => handleAddFriend(user.id)}
                        >
                            Add Friend
                        </Button>
                    </div>
                ))}
        </div>
    );
}

function AddFriend() {
    const [search, setSearch] = useState(''); // ← add this

    return (
        <div>
            <div className="searchContainer">
                <TextField
                    className="searchBar"
                    placeholder="Search for friends"
                    variant="outlined"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </div>
            <div>
                <Users search={search} />
            </div>
        </div>
    );
}

export default AddFriend;