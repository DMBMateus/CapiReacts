import BACKEND_URL from '../../config';
import { useState, useContext } from 'react';
import { TextField, Button, IconButton, Collapse, CircularProgress, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { ProfileContext } from "../App";
import user_icon from "../../Assets/user_icon.png";

function Comments({ postId, comments, onCommentAdded }) {
    const { profile } = useContext(ProfileContext);
    const [open, setOpen] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingList, setLoadingList] = useState(false);

    const handleToggle = () => setOpen(prev => !prev);

    const handleSubmit = async () => {
        if (!newComment.trim() || loading) return;
        setLoading(true);
        setError('');

        try {
            // Moderate first
            const modRes = await fetch(`${BACKEND_URL}/api/moderate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment }),
            });
            const modResult = await modRes.json();

            if (!modResult.approved) {
                setError(`Comment rejected: ${modResult.reason}`);
                setLoading(false);
                return;
            }

            // Submit comment
            const res = await fetch(`${BACKEND_URL}/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: Number(profile), content: newComment }),
            });
            const data = await res.json();

            if (res.ok && data.id) {
                onCommentAdded(data);
                setNewComment('');
            } else {
                setError(data.error || 'Failed to post comment.');
            }
        } catch (err) {
            setError('Could not connect to server. Try again.');
        }
        setLoading(false);
    };

    return (
        <div style={{ marginTop: '0.75rem' }}>
            <div
                onClick={handleToggle}
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px' }}
            >
                <IconButton size="small">
                    {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <span style={{ fontSize: '0.9rem', color: '#555' }}>
                    {comments.length} comment{comments.length !== 1 ? 's' : ''}
                </span>
            </div>

            <Collapse in={open}>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {comments.length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: '#777', margin: 0 }}>
                            No comments yet. Be the first to comment!
                        </p>
                    )}
                    {comments.map(comment => (
                        <div key={comment.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <img
                                src={
                                    comment.User?.profile_picture
                                        ? (comment.User.profile_picture.startsWith('http')
                                            ? comment.User.profile_picture
                                            : `${BACKEND_URL}${comment.User.profile_picture}`)
                                        : user_icon
                                }
                                alt="Profile"
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div style={{ background: '#f0f0f0', borderRadius: '8px', padding: '6px 10px', flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>{comment.User?.name}</p>
                                <p style={{ margin: 0, fontSize: '0.85rem' }}>{comment.content}</p>
                            </div>
                        </div>
                    ))}

                    {error && <Alert severity="error" style={{ fontSize: '0.8rem' }}>{error}</Alert>}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <TextField
                            size="small"
                            placeholder="Write a comment..."
                            fullWidth
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            disabled={loading}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleSubmit}
                            disabled={!newComment.trim() || loading}
                        >
                            {loading ? <CircularProgress size={18} /> : 'Post'}
                        </Button>
                    </div>
                </div>
            </Collapse>
        </div>
    );
}

export default Comments;