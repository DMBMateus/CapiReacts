import { useState } from 'react';
import Posts from "../Posts/Posts";
import Friends from "../Friends/Friends";
import Banner from "../Banner/Banner";
import NewPost from "../Posts/NewPost";

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

export default LandingPage;