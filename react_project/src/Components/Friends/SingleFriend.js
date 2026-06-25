import { useContext } from 'react';
import { FriendContext } from '../App';
import '../../Components_CSS/Friends.css';
import user_icon from "../../Assets/user_icon.png";
import {useTheme} from "@mui/material/styles";

function SingleFriend(props) {
    const { openFriendDrawer } = useContext(FriendContext);
    const theme = useTheme();

    return (
        <div
            className="container friends" style={{
            background: theme.palette.primary.main,
            cursor: 'pointer'
        }}
            onClick={() => openFriendDrawer({
                id: props.id,
                name: props.name,
                online: props.online,
                email: props.email,
                phone: props.phone,
                gender: props.gender,
                profile_picture: props.profile_picture,
            })}
        >
            <div className="avatar-wrapper">
                <img className="friend-img" src={props.profile_picture ? (props.profile_picture.startsWith('http') ? props.profile_picture : `http://localhost:5000${props.profile_picture}`) : user_icon} alt="Profile Icon"/>
                <span className={`status-dot ${props.online ? 'online' : 'offline'}`}></span>
            </div>
            <h2 className="status" style={{
                color: theme.palette.secondary.main,
            }}>{props.name}</h2>
        </div>
    );
}

export default SingleFriend;