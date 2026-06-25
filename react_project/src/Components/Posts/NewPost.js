import BACKEND_URL from '../../config';
import { useState, useContext } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import new_post from "../../Assets/new_post.png";
import '../../Components_CSS/NewPost.css';
import { ProfileContext } from "../App";

function NewPost() {
    const { profile } = useContext(ProfileContext);
    const [newPostOpen, setNewPostOpen] = useState(false);
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNewPostClick = () => setNewPostOpen(true);

    const closeNewPostDialog = () => {
        if (loading) return; // prevent closing while request in flight
        setNewPostOpen(false);
        setPostTitle('');
        setPostContent('');
    };

    const handleCreatePost = async () => {
        if (!postTitle.trim() || !postContent.trim() || loading) return;
        setLoading(true);
        try {
            // POST to /api/posts and include user_id (backend expects /api/posts)
            const payload = {
                title: postTitle,
                content: postContent,
                user_id: Number(profile)
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

            
            if (res.ok || (data && (data.message === 'Post created' || data.id || data._id || data.user_id))) {
                // success
                closeNewPostDialog();
                // refresh posts (simple approach)
                window.location.reload();
            } else {
                console.error('Failed to create post:', data);
                alert('Failed to create post: ' + (data && (data.error || data.message) ? (data.error || data.message) : 'Unknown error'));
            }
        } catch (err) {
            console.error('Failed to create post:', err);
            alert('Failed to create post: ' + err.message);
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
                        {loading ? 'Posting...' : 'Post'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default NewPost;
