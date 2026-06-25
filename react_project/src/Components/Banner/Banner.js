import '../../Components_CSS/Banner.css';
import connect_background from "../../Assets/connect_background.png";
import connect_text from "../../Assets/connect_text.png";
import talking from "../../Assets/talking.png";
import stars_hearts from "../../Assets/stars_hearts.png";

function Banner() {
    return (
        <div>
            <img src={connect_background} className="connectImg connect_background" alt="connect with us, make new friends!"/>
            <img src={connect_text} className="connectImg connect_text" alt="connect with us, make new friends!"/>
            <img src={talking} className="connectImg talking" alt="connect with us, make new friends!"/>
            <img src={stars_hearts} className="connectImg stars_hearts" alt="connect with us, make new friends!"/>
        </div>
    )
}

export default Banner;