import BACKEND_URL from '../../config';
import { useState, useEffect, useContext } from 'react';
import '../../Components_CSS/Posts.css';
import user_icon from "../../Assets/user_icon.png";
import like_button from "../../Assets/like_button.png";
import { ProfileContext, FriendContext } from "../App";
import { useTheme } from '@mui/material/styles';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import Comments from "./Comments";

function Posts({ onRegisterPostCreated }) {
    const [posts, setPosts] = useState([]);
    const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
    const { profile } = useContext(ProfileContext); // ← current logged-in user id
    const { openFriendDrawer, friendsList } = useContext(FriendContext); // ← to open friend drawer
    const [likedPosts, setLikedPosts] = useState({}); // ← tracks which posts are liked
    const [shareDialogOpen, setShareDialogOpen] = useState(false); // ← share dialog state
    const [selectedPostForShare, setSelectedPostForShare] = useState(null); // ← which post to share
    const [sharedPosts, setSharedPosts] = useState({}); // ← tracks shared posts: { userId: [postIds] }
    const [commentsByPost, setCommentsByPost] = useState({}); // ← tracks comments per post

    const theme = useTheme();

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/posts/user/${profile}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    console.log('Posts data received:', data); // Debug log
                    setPosts(data);
                    // Track which posts are shared
                    const sharedPostIds = data
                        .filter(post => post.isSharedWithUser)
                        .map(post => post.id);
                    if (sharedPostIds.length > 0) {
                        setSharedPosts(prev => ({
                            ...prev,
                            [profile]: sharedPostIds,
                        }));
                    }
                    // For each post, check if current user already liked it
                    data.forEach(post => {
                        fetch(`${BACKEND_URL}/api/posts/${post.id}/likes?userId=${profile}`)
                            .then(res => res.json())
                            .then(({ liked }) => {
                                setLikedPosts(prev => ({ ...prev, [post.id]: liked }));
                            });
                    });
                    // For each post, fetch its comments
                    data.forEach(post => {
                        fetch(`${BACKEND_URL}/api/posts/${post.id}/comments`)
                            .then(res => res.json())
                            .then(comments => {
                                setCommentsByPost(prev => ({ ...prev, [post.id]: comments }));
                            })
                            .catch(err => console.error('Failed to fetch comments:', err));
                    });
                }
            })
            .catch(err => console.error('Failed to fetch posts:', err));
    }, [profile]);

    // Called by NewPost when a post is successfully created
    const handlePostCreated = (newPost) => {
        setPosts(prev => [newPost, ...prev]);
        setLikedPosts(prev => ({ ...prev, [newPost.id]: false }));
        setCommentsByPost(prev => ({ ...prev, [newPost.id]: [] }));
    };

    // Called by Comments when a new comment is successfully posted
    const handleCommentAdded = (postId, newComment) => {
        setCommentsByPost(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), newComment],
        }));
    };

    // Register the callback with LandingPage once on mount
    useEffect(() => {
        if (onRegisterPostCreated) {
            onRegisterPostCreated(() => handlePostCreated);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onRegisterPostCreated]);

    // derive sorted posts for rendering based on sortOrder
    const sortedPosts = posts.slice().sort((a, b) => {
        // Check if posts are shared with current user (using backend response)
        const aIsShared = a.isSharedWithUser;
        const bIsShared = b.isSharedWithUser;

        // Shared posts come first
        if (aIsShared && !bIsShared) return -1;
        if (!aIsShared && bIsShared) return 1;

        // For non-shared posts, sort by date/id based on sortOrder
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : (a.id || 0);
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : (b.id || 0);
        return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });

    const handleUnshare = (postId) => {
        fetch(`${BACKEND_URL}/api/posts/${postId}/share/${profile}`, {
            method: 'DELETE',
        })
            .then(res => res.json())
            .then(data => {
                console.log('Post unshared:', data);
                // Update the post in place instead of removing it
                setPosts(prev => prev.map(post =>
                    post.id === postId
                        ? { ...post, isSharedWithUser: false, sharedByUserName: null }
                        : post
                ));
            })
            .catch(err => console.error('Failed to unshare post:', err));
    };

    const handleLike = (postId) => {
        fetch(`${BACKEND_URL}/api/posts/${postId}/like`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profile }),
        })
            .then(res => res.json())
            .then(data => {
                // update UI based on response
                if (data.error) {
                    console.error('Server error:', data.error);
                    return;
                }
                setPosts(prev => prev.map(post =>
                    post.id === postId ? { ...post, likes_count: data.likes_count } : post
                ));
                setLikedPosts(prev => ({ ...prev, [postId]: data.liked }));
            })
            .catch(err => console.error('Failed to like post:', err));
    };

    const handleAuthorClick = (post) => {
        // Open the author's profile in the drawer without the remove friend button
        openFriendDrawer({
            id: post.User?.id,
            name: post.User?.name,
            email: post.User?.email,
            phone: post.User?.phone,
            gender: post.User?.gender,
            profile_picture: post.User?.profile_picture,
            online: post.User?.online,
        }, { showRemoveButton: false });
    };

    const handleShareClick = (post) => {
        setSelectedPostForShare(post);
        setShareDialogOpen(true);
    };

    const handleShareWithUser = (userId) => {
        if (!selectedPostForShare) return;

        // Close dialog
        setShareDialogOpen(false);
        const postIdToShare = selectedPostForShare.id;
        setSelectedPostForShare(null);

        // Send to backend
        fetch(`${BACKEND_URL}/api/posts/${postIdToShare}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, sharedBy: profile }),
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log('Post shared successfully:', data);
                // Optional: Refresh posts to show updated share info
                // In this case, we'll just update local state
            })
            .catch(err => console.error('Failed to share post:', err));
    };

    function timeAgo(dateString) {
        const now = new Date();
        const created = new Date(dateString);
        const seconds = Math.floor((now - created) / 1000);

        const intervals = [
            { label: 'year',   seconds: 31536000 },
            { label: 'month',  seconds: 2592000  },
            { label: 'week',   seconds: 604800   },
            { label: 'day',    seconds: 86400    },
            { label: 'hour',   seconds: 3600     },
            { label: 'minute', seconds: 60       },
            { label: 'second', seconds: 1        },
        ];

        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 1rem' }}>
                <Button variant="contained" size="small" onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}>
                    {sortOrder === 'newest' ? 'Newest → Oldest' : 'Oldest → Newest'}
                </Button>
            </div>

            <div className="posts-container" >
                {sortedPosts.map(post => {
                    const isShared = post.isSharedWithUser;
                    return (
                        <div key={post.id} className={`post-card ${isShared ? 'post-card-shared' : ''}`} style={{
                            background: isShared ? '#FFA500' : theme.palette.primary.main,
                        }}>
                            <h4 style={{ margin: 0,}}>{timeAgo(post.createdAt)}</h4>
                            {isShared && post.sharedByUserName && (
                                <div style={{
                                    textAlign: 'right',
                                    fontSize: '0.85rem',
                                    color: '#333',
                                    marginBottom: '0.5rem',
                                    fontStyle: 'italic',
                                }}>
                                    Shared by {post.sharedByUserName}
                                </div>
                            )}
                            <div className="container" style={{ cursor: 'pointer' }} onClick={() => handleAuthorClick(post)}>
                                <img className="friend-img-post" src={post.User?.profile_picture ? (post.User.profile_picture.startsWith('http') ? post.User.profile_picture : `${BACKEND_URL}${post.User.profile_picture}`) : user_icon} alt="Profile Icon"/>
                                <h3>{post.User?.name}</h3>
                            </div>
                            <h2>{post.title}</h2>
                            <p style={{ color: theme.palette.secondary.main }}>{post.content}</p>

                            {post.media_url && (
                                post.media_type === 'video' ? (
                                    <video
                                        controls
                                        style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '400px' }}
                                    >
                                        <source src={post.media_url} />
                                    </video>
                                ) : (
                                    <img
                                        src={post.media_url}
                                        alt="Post media"
                                        style={{ width: '100%', borderRadius: '8px', marginTop: '0.5rem', maxHeight: '400px', objectFit: 'cover' }}
                                    />
                                )
                            )}
                            <div className="container">
                                <img
                                    src={like_button}
                                    onClick={() => handleLike(post.id)}
                                    className="like_button"
                                    alt="like button"
                                />
                                <h3 style={{ cursor: 'pointer', color: likedPosts[post.id] ? 'red' : 'grey' }}>
                                    {post.likes_count}
                                </h3>
                                <ShareIcon
                                    onClick={() => handleShareClick(post)}
                                    sx={{ cursor: 'pointer', marginLeft: '1rem', fontSize: '1.5rem', color: '#555', transition: 'all 0.2s ease', '&:hover': { color: '#db222a', transform: 'scale(1.2)' } }}
                                />
                                {isShared && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        color="error"
                                        onClick={() => handleUnshare(post.id)}
                                        sx={{ marginLeft: '1rem' }}
                                    >
                                        Mark as seen
                                    </Button>
                                )}
                            </div>

                            <Comments
                                postId={post.id}
                                comments={commentsByPost[post.id] || []}
                                onCommentAdded={(comment) => handleCommentAdded(post.id, comment)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Share Dialog */}
            <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
                <DialogTitle>Share post with:</DialogTitle>
                <DialogContent>
                    <List>
                        {friendsList.map(friend => (
                            <ListItem key={friend.id} disablePadding>
                                <ListItemButton onClick={() => handleShareWithUser(friend.id)}>
                                    <ListItemText primary={friend.name} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShareDialogOpen(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default Posts;