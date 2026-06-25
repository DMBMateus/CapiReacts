const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const User = require('./models/User');
const Friendship = require('./models/Friendship');
const Post = require('./models/Post');
const PostLike = require('./models/PostLike');
const PostShare = require('./models/PostShare');
const { Op } = require('sequelize'); // ← add this at the top of server.js
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Multer setup for handling image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
        cb(null, `${base}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage: storage });


//------------------------------USERS------------------------------------

// CREATE a new user
app.post('/api/users', async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET a user by id
app.get('/api/users/:id', async (req, res) => {
    const user = await User.findByPk(req.params.id);
    res.json(user);
});

// GET all users
app.get('/api/users', async (req, res) => {
    const users = await User.findAll();
    res.json(users);
});

//------------------------------FRIENDS------------------------------------

// Add associations for PostShare
PostShare.belongsTo(User, {
    foreignKey: 'shared_by_user_id',
    as: 'SharedByUser',
});

// Many-to-many: a User can have many friends, through the Friendship table
User.belongsToMany(User, {
    through: Friendship,
    as: 'friends',
    foreignKey: 'userId',
    otherKey: 'friendId',
});

// POST /api/users/1/friends  { friendId: 2 }
app.post('/api/users/:id/friends', async (req, res) => {
    try {
        const userId = req.params.id;
        const friendId = req.body.friendId;

        // Create both directions in one go
        await Friendship.bulkCreate([
            { userId: userId, friendId: friendId },
            { userId: friendId, friendId: userId },
        ]);

        res.json({ message: 'Friendship created' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/users/1/friends
app.get('/api/users/:id/friends', async (req, res) => {
    const user = await User.findByPk(req.params.id, {
        include: { model: User, as: 'friends' }, // pulls in the related users via Friendship
    });
    res.json(user.friends);
});

app.delete('/api/users/:id/friends/:friendId', async (req, res) => {
    try {
        const userId = req.params.id;
        const friendId = req.params.friendId;

        await Friendship.destroy({
            where: {
                [Op.or]: [ // ← Op.or instead of Sequelize.Op.or
                    { userId: userId, friendId: friendId },
                    { userId: friendId, friendId: userId },
                ],
            },
        });

        res.json({ message: 'Friendship removed' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//------------------------------POSTS------------------------------------

// Add this association near your other associations (after User and Post imports)
Post.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Post, { foreignKey: 'user_id' });

// Then update the GET all posts route:
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: {
                model: User,
                attributes: ['name', 'profile_picture', 'id'], // include profile picture and id for frontend
            }
        });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all posts with shared posts for a specific user (includes shared flag)
app.get('/api/posts/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Get all posts
        const posts = await Post.findAll({
            include: {
                model: User,
                attributes: ['name', 'profile_picture', 'id'],
            }
        });

        // Get all shared posts for this user (with sharer info)
        const sharedPosts = await PostShare.findAll({
            where: { shared_with_user_id: userId },
            include: [{
                model: User,
                as: 'SharedByUser',
                attributes: ['id', 'name'],
            }]
        });

        // Create a map of post_id -> share info
        const shareMap = {};
        sharedPosts.forEach(share => {
            shareMap[share.post_id] = {
                sharedByUserId: share.shared_by_user_id,
                sharedByUserName: share.SharedByUser?.name || 'Unknown',
            };
        });

        // Mark posts that are shared with this user and add sharer info
        const postsWithShareInfo = posts.map(post => {
            const shareInfo = shareMap[post.id];
            return {
                ...post.toJSON(),
                isSharedWithUser: !!shareInfo,
                sharedByUserName: shareInfo?.sharedByUserName || null,
            };
        });

        // Sort: shared posts first, then by creation date
        const sortedPosts = postsWithShareInfo.sort((a, b) => {
            if (a.isSharedWithUser && !b.isSharedWithUser) return -1;
            if (!a.isSharedWithUser && b.isSharedWithUser) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.json(sortedPosts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all posts by a specific user
app.get('/api/users/:id/posts', async (req, res) => {
    try {
        const posts = await Post.findAll({
            where: { user_id: req.params.id }
        });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload/update profile picture for a user
app.post('/api/users/:id/profile_picture', upload.single('image'), async (req, res) => {
    try {
        const userId = req.params.id;
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Save relative path to DB (served at /uploads)
        const filePath = `/uploads/${req.file.filename}`;

        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.profile_picture = filePath;
        await user.save();

        // Return updated user
        res.json({ id: user.id, profile_picture: user.profile_picture });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET a single post by id
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE a new post
app.post('/api/posts', async (req, res) => {
    try {
        const post = await Post.create(req.body);
        res.json(post);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.patch('/api/posts/:id/like', async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.body.userId; // ← sent from React

        // Check if like already exists
        const existingLike = await PostLike.findOne({
            where: { user_id: userId, post_id: postId }
        });

        const post = await Post.findByPk(postId);

        if (existingLike) {
            // Already liked → unlike
            await existingLike.destroy();
            post.likes_count -= 1;
        } else {
            // Not liked yet → like
            await PostLike.create({ user_id: userId, post_id: postId });
            post.likes_count += 1;
        }

        await post.save();
        res.json({ likes_count: post.likes_count, liked: !existingLike });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET likes for a post (to check if current user already liked it)
app.get('/api/posts/:id/likes', async (req, res) => {
    try {
        const userId = req.query.userId; // ← /api/posts/1/likes?userId=1
        const like = await PostLike.findOne({
            where: { user_id: userId, post_id: req.params.id }
        });
        res.json({ liked: Boolean(like) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/posts/:id/share - Share a post with another user
app.post('/api/posts/:id/share', async (req, res) => {
    try {
        const postId = req.params.id;
        const sharedWithUserId = req.body.userId; // ← who to share with
        const sharedByUserId = req.body.sharedBy; // ← who is sharing

        // Validate post exists
        const post = await Post.findByPk(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Validate recipient user exists
        const recipient = await User.findByPk(sharedWithUserId);
        if (!recipient) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if already shared (prevent duplicates)
        const existingShare = await PostShare.findOne({
            where: {
                post_id: postId,
                shared_with_user_id: sharedWithUserId,
            }
        });

        if (existingShare) {
            return res.status(400).json({ message: 'Post already shared with this user' });
        }

        // Create share record
        const share = await PostShare.create({
            post_id: postId,
            shared_by_user_id: sharedByUserId,
            shared_with_user_id: sharedWithUserId,
        });

        res.json({ message: 'Post shared successfully', share });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/posts/:postId/share/:userId - Unshare a post from a specific user
app.delete('/api/posts/:postId/share/:userId', async (req, res) => {
    try {
        const { postId, userId } = req.params;

        const share = await PostShare.findOne({
            where: {
                post_id: postId,
                shared_with_user_id: userId,
            }
        });

        if (!share) {
            return res.status(404).json({ error: 'Share not found' });
        }

        await share.destroy();
        res.json({ message: 'Share removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a post
app.delete('/api/posts/:id', async (req, res) => {
    try {
        await Post.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


const PORT = 5000;
sequelize.sync()
    .then(() => {
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error('Failed to connect to database:', err));

// Generic error handler to return JSON (prevents HTML error pages for API requests)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});
