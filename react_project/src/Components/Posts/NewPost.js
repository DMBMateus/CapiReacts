import BACKEND_URL from '../../config';
import { useState, useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert } from '@mui/material';
import new_post from "../../Assets/new_post.png";
import '../../Components_CSS/NewPost.css';
import { ProfileContext } from "../App";

function NewPost({ onPostCreated }) {
    const { profile } = useContext(ProfileContext);
    const [newPostOpen, setNewPostOpen] = useState(false);
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleNewPostClick = () => setNewPostOpen(true);

    const closeNewPostDialog = () => {
        if (loading) return;
        setNewPostOpen(false);
        setPostTitle('');
        setPostContent('');
        setError('');
    };

    const handleCreatePost = async () => {
        if (!postTitle.trim() || !postContent.trim() || loading) return;
        setLoading(true);
        setError('');

        try {
            // Step 1 — Moderate content before posting
            const modRes = await fetch(`${BACKEND_URL}/api/moderate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: postTitle, content: postContent }),
            });
            const modResult = await modRes.json();

            if (!modResult.approved) {
                setError(`Your post was rejected: ${modResult.reason}`);
                setLoading(false);
                return;
            }

            // Step 2 — Submit the post if approved
            const payload = {
                title: postTitle,
                content: postContent,
                user_id: Number(profile),
            };
            const res = await fetch(`${BACKEND_URL}/api/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            let data;
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { message: text };
            }

            if (res.ok && data && data.id) {
                // Step 3 — Fetch the full post (with author info) to add to the list
                const fullPost = await fetch(`${BACKEND_URL}/api/posts/${data.id}`)
                    .then(r => r.json());

                if (onPostCreated) {
                    onPostCreated({
                        ...fullPost,
                        likes_count: fullPost.likes_count ?? 0,
                        isSharedWithUser: false,
                    });
                }

                closeNewPostDialog();
            } else {
                setError('Failed to create post: ' + (data?.error || data?.message || 'Unknown error'));
            }
        } catch (err) {
            setError('Failed to create post: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <img
                className="new_post_img"
                src={new_post}
                alt="Create new post"
                onClick={handleNewPostClick}
            />

            <Dialog open={newPostOpen} onClose={closeNewPostDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" style={{ marginBottom: '1rem' }}>
                            {error}
                        </Alert>
                    )}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Post Title"
                        fullWidth
                        variant="outlined"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        sx={{ marginTop: '1rem', marginBottom: '1rem' }}
                    />
                    <TextField
                        margin="dense"
                        label="What's on your mind?"
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeNewPostDialog} disabled={loading}>Cancel</Button>
                    <Button
                        onClick={handleCreatePost}
                        variant="contained"
                        color="primary"
                        disabled={!postTitle.trim() || !postContent.trim() || loading}
                    >
                        {loading ? 'Checking & Posting...' : 'Post'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default NewPost;