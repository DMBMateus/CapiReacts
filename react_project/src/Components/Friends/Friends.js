import {useEffect, useContext} from 'react';
import '../../Components_CSS/Friends.css';
import SingleFriend from "./SingleFriend";
import {ProfileContext, FriendContext} from "../App"; // ← add FriendContext
import {useTheme} from "@mui/material/styles";

function Friends() {
    const { friendsList, setFriendsList } = useContext(FriendContext); // ← from context instead of local state
    const { profile } = useContext(ProfileContext);
    const theme = useTheme();

    useEffect(() => {
        fetch('http://localhost:5000/api/users/' + profile + '/friends')
            .then(res => res.json())
            .then(data => setFriendsList(data))
            .catch(err => console.error('Failed to fetch friends:', err));
    }, [profile, setFriendsList]);

    return (
        <div className="friends" style={{
            background: theme.palette.primary.main,
        }}>
            {friendsList.length === 0 &&
                <h2>No friends</h2>
            }
            {friendsList.length !== 0 &&
                <h2>Friends:</h2>
            }
            {friendsList.map(friend => (
                <SingleFriend
                    key={friend.id}
                    id={friend.id}
                    name={friend.name}
                    online={friend.online}
                    email={friend.email}
                    phone={friend.phone}
                    gender={friend.gender}
                    profile_picture={friend.profile_picture}
                />
            ))}
        </div>
    );
}

export default Friends;