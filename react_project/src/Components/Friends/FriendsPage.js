import AddFriend from "./AddFriend";
import capi_body from "../../Assets/capi_friends.png";
import capi_arm from "../../Assets/capi_arm.png";

function FriendsPage() {
    return (
        <div className="container">
            <AddFriend />
            <img className="capi-addFriends-body" src={capi_body} alt="Capi animation"/>
            <img className="capi-addFriends-arm" src={capi_arm} alt="Capi waving arm"/>
        </div>
    );
}

export default FriendsPage;