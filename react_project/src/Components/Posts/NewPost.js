import BACKEND_URL from '../../config';
import { useState, useContext, useRef } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Alert, Box, IconButton } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import new_post from "../../Assets/new_post.png";
import '../../Components_CSS/NewPost.css';
import { ProfileContext } from "../App";

function NewPost({ onPostCreated }) {
    const { profile } = useContext(ProfileContext);
    const [newPostOpen, setNewPostOpen] = useState(false);
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [error, setError] = useState('');
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState(null);
    const fileInputRef = useRef(null);

    const handleNewPostClick = () => setNewPostOpen(true);

    const closeNewPostDialog = () => {
        if (loading) return;
        setNewPostOpen(false);
        setPostTitle('');
        setPostContent('');
        setError('');
        setMediaFile(null);
        setMediaPreview(null);
        setMediaType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleMediaChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMediaFile(file);
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
        setMediaPreview(URL.createObjectURL(file));
    };

    const removeMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setMediaType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCreatePost = async () => {
        if (!postTitle.trim() || !postContent.trim() || loading) return;
        setLoading(true);
        setError('');

        try {
            // Step 1 — Moderate content
            setLoadingStep('Checking content...');
            const modRes = await fetch(`${BACKEND_URL}/api/moderate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: postTitle, content: postContent }),
            });
            const modResult = await modRes.json();

            if (!modResult.approved) {
                setError(`Your post was rejected: ${modResult.reason}`);
                return;
            }

            // Step 2 — Upload media if selected
            let media_url = null;
            let media_type = null;

            if (mediaFile) {
                setLoadingStep('Uploading media...');
                const formData = new FormData();
                formData.append('media', mediaFile);
                const uploadRes = await fetch(`${BACKEND_URL}/api/posts/upload`, {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
                media_url = uploadData.media_url;
                media_type = uploadData.media_type;
            }

            // Step 3 — Create the post
            setLoadingStep('Posting...');
            const payload = {
                title: postTitle,
                content: postContent,
                user_id: Number(profile),
                media_url,
                media_type,
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

            if (res.ok && data?.id) {
                const fullPost = await fetch(`${BACKEND_URL}/api/posts/${data.id}`).then(r => r.json());
                if (onPostCreated) {
                    onPostCreated({ ...fullPost, likes_count: fullPost.likes_count ?? 0, isSharedWithUser: false });
                }
                closeNewPostDialog();
            } else {
                setError('Failed to create post: ' + (data?.error || data?.message || 'Unknown error'));
            }
        } catch (err) {
            setError('Failed to create post: ' + err.message);
        } finally {
            setLoading(false);
            setLoadingStep('');
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

                    {/* Media preview */}
                    {mediaPreview && (
                        <Box sx={{ position: 'relative', marginTop: '1rem' }}>
                            <IconButton
                                size="small"
                                onClick={removeMedia}
                                sx={{
                                    position: 'absolute', top: 4, right: 4, zIndex: 1,
                                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                                    '&:hover': { background: 'rgba(0,0,0,0.75)' },
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                            {mediaType === 'video' ? (
                                <video controls style={{ width: '100%', borderRadius: '8px', maxHeight: '300px' }}>
                                    <source src={mediaPreview} />
                                </video>
                            ) : (
                                <img
                                    src={mediaPreview}
                                    alt="Preview"
                                    style={{ width: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'cover' }}
                                />
                            )}
                        </Box>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        style={{ display: 'none' }}
                        onChange={handleMediaChange}
                    />
                    <Button
                        startIcon={<AddPhotoAlternateIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        sx={{ marginTop: '1rem' }}
                    >
                        {mediaFile ? 'Change Media' : 'Add Photo / Video'}
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeNewPostDialog} disabled={loading}>Cancel</Button>
                    <Button
                        onClick={handleCreatePost}
                        variant="contained"
                        color="primary"
                        disabled={!postTitle.trim() || !postContent.trim() || loading}
                    >
                        {loading ? loadingStep : 'Post'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default NewPost;