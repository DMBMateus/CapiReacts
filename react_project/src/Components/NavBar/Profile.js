import BACKEND_URL from '../../config';
import { useRef, useState, useContext } from 'react';
import user_icon from "../../Assets/user_icon.png";
import '../../Components_CSS/Profile.css';
import { ProfileContext } from "../App";

function normalizeSrc(src) {
    if (!src) return user_icon;
    if (typeof src !== 'string') return user_icon;
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    if (src.startsWith('/')) return `${BACKEND_URL}${src}`; // e.g. /uploads/...
    // fallback for relative paths stored in DB (like '../../Assets/...')
    return user_icon;
}

function Profile(props) {
    const { profile: currentProfile } = useContext(ProfileContext);
    const [imageSrc, setImageSrc] = useState(normalizeSrc(props.profile_picture));
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const isEditable = props.id && Number(props.id) === Number(currentProfile);

    const onImageClick = () => {
        if (!isEditable) return;
        fileInputRef.current?.click();
    };

    const onFileChange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('image', file);

            const uploadUrl = `${BACKEND_URL}/api/users/${currentProfile}/profile_picture`;
            const res = await fetch(uploadUrl, {
                method: 'POST',
                body: form,
            });

            // Parse response safely: backend may return HTML on error
            let data;
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                // not JSON (probably an HTML error page) — read as text for debugging
                const text = await res.text();
                data = { __raw: text };
            }

            if (res.ok && data.profile_picture) {
                // Build absolute URL for served upload
                const url = normalizeSrc(data.profile_picture);
                setImageSrc(url);
            } else {
                console.error('Upload failed', res.status, data);
                const raw = data && data.__raw ? data.__raw : '';
                // Detect React dev server fallback (HTML) and give a friendly hint
                if (raw.includes('Cannot POST') || raw.includes('<!DOCTYPE html>')) {
                    alert('Failed to upload image: It looks like the request reached the frontend dev server (port 3000) instead of the backend (port 5000).\n\nPlease make sure your backend is running on port 5000 and that you restarted it after adding the upload endpoint.\n\nAlso check the Network tab for the request URL.');
                } else {
                    const msg = data && (data.error || data.message) ? (data.error || data.message) : (raw || 'Unknown');
                    alert('Failed to upload image: ' + msg);
                }
            }
        } catch (err) {
            console.error('Upload error', err);
            alert('Failed to upload image: ' + err.message);
        } finally {
            setUploading(false);
            // reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div>
            <img
                className={"profile-drawer-img"}
                src={imageSrc}
                alt="Profile Icon"
                onClick={onImageClick}
                style={{ cursor: isEditable ? 'pointer' : 'default', opacity: uploading ? 0.6 : 1 }}
            />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
            <h2>Name:</h2>
            <h3>{props.name}</h3>
            <h2>Email: </h2>
            <h3>{props.email}</h3>
            <h2>Phone: </h2>
            <h3>{props.phone}</h3>
            <h2>Gender: </h2>
            <h3>{props.gender}</h3>
        </div>
    )
}

export default Profile;