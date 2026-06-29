const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const sequelize = require('./config/database');
const User = require('./models/User');
const Friendship = require('./models/Friendship');
const Post = require('./models/Post');
const PostLike = require('./models/PostLike');
const PostShare = require('./models/PostShare');
const { Op } = require('sequelize');
const Anthropic = require('@anthropic-ai/sdk');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
console.log('Anthropic key loaded:', !!process.env.ANTHROPIC_API_KEY);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'capireacts',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    },
});
const upload = multer({ storage });

const app = express();

app.use(cors());
app.use(express.json());

//------------------------------USERS------------------------------------

// CREATE a new user
app.post('/api/users', async (req, res) => {
    try {
        const userData = { ...req.body };
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }
        const user = await User.create(userData);
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// LOGIN — must be before /api/users/:id to avoid 'login' being treated as an id
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'No account found with that email.' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Incorrect password.' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
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

PostShare.belongsTo(User, {
    foreignKey: 'shared_by_user_id',
    as: 'SharedByUser',
});

User.belongsToMany(User, {
    through: Friendship,
    as: 'friends',
    foreignKey: 'userId',
    otherKey: 'friendId',
});

app.post('/api/users/:id/friends', async (req, res) => {
    try {
        const userId = req.params.id;
        const friendId = req.body.friendId;
        await Friendship.bulkCreate([
            { userId: userId, friendId: friendId },
            { userId: friendId, friendId: userId },
        ]);
        res.json({ message: 'Friendship created' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/users/:id/friends', async (req, res) => {
    const user = await User.findByPk(req.params.id, {
        include: { model: User, as: 'friends' },
    });
    if (!user) return res.json([]);
    res.json(user.friends);
});

app.delete('/api/users/:id/friends/:friendId', async (req, res) => {
    try {
        const userId = req.params.id;
        const friendId = req.params.friendId;
        await Friendship.destroy({
            where: {
                [Op.or]: [
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

Post.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Post, { foreignKey: 'user_id' });

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.findAll({
            include: {
                model: User,
                attributes: ['name', 'profile_picture', 'id'],
            }
        });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/posts/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const posts = await Post.findAll({
            include: {
                model: User,
                attributes: ['name', 'profile_picture', 'id'],
            }
        });
        const sharedPosts = await PostShare.findAll({
            where: { shared_with_user_id: userId },
            include: [{
                model: User,
                as: 'SharedByUser',
                attributes: ['id', 'name'],
            }]
        });
        const shareMap = {};
        sharedPosts.forEach(share => {
            shareMap[share.post_id] = {
                sharedByUserId: share.shared_by_user_id,
                sharedByUserName: share.SharedByUser?.name || 'Unknown',
            };
        });
        const postsWithShareInfo = posts.map(post => {
            const shareInfo = shareMap[post.id];
            return {
                ...post.toJSON(),
                isSharedWithUser: !!shareInfo,
                sharedByUserName: shareInfo?.sharedByUserName || null,
            };
        });
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

app.get('/api/users/:id/posts', async (req, res) => {
    try {
        const posts = await Post.findAll({ where: { user_id: req.params.id } });
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
        const imageUrl = req.file.path;
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.profile_picture = imageUrl;
        await user.save();
        res.json({ id: user.id, profile_picture: user.profile_picture });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.id);
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        const userId = req.body.userId;
        const existingLike = await PostLike.findOne({
            where: { user_id: userId, post_id: postId }
        });
        const post = await Post.findByPk(postId);
        if (existingLike) {
            await existingLike.destroy();
            post.likes_count -= 1;
        } else {
            await PostLike.create({ user_id: userId, post_id: postId });
            post.likes_count += 1;
        }
        await post.save();
        res.json({ likes_count: post.likes_count, liked: !existingLike });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/posts/:id/likes', async (req, res) => {
    try {
        const userId = req.query.userId;
        const like = await PostLike.findOne({
            where: { user_id: userId, post_id: req.params.id }
        });
        res.json({ liked: Boolean(like) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/:id/share', async (req, res) => {
    try {
        const postId = req.params.id;
        const sharedWithUserId = req.body.userId;
        const sharedByUserId = req.body.sharedBy;
        const post = await Post.findByPk(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        const recipient = await User.findByPk(sharedWithUserId);
        if (!recipient) return res.status(404).json({ error: 'User not found' });
        const existingShare = await PostShare.findOne({
            where: { post_id: postId, shared_with_user_id: sharedWithUserId }
        });
        if (existingShare) {
            return res.status(400).json({ message: 'Post already shared with this user' });
        }
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

app.delete('/api/posts/:postId/share/:userId', async (req, res) => {
    try {
        const { postId, userId } = req.params;
        const share = await PostShare.findOne({
            where: { post_id: postId, shared_with_user_id: userId }
        });
        if (!share) return res.status(404).json({ error: 'Share not found' });
        await share.destroy();
        res.json({ message: 'Share removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        await Post.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//------------------------------MODERATION------------------------------------

app.post('/api/moderate', async (req, res) => {
    const { title, content } = req.body;
    try {
        const message = await Promise.race([
            anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 100,
                messages: [{
                    role: 'user',
                    content: `You are a content moderator. Check if the following post title and content contain any inappropriate text (hate speech, explicit content, harassment, spam, or offensive language). Reply with ONLY a raw JSON object, no markdown, no code fences, no explanation. Only these two formats are allowed: {"approved": true} or {"approved": false, "reason": "brief reason here"}.
                    
Title: ${title}
Content: ${content}`,
                }],
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Moderation timed out')), 10000)
            )
        ]);
        const raw = message.content[0].text.trim()
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```$/i, '')
            .trim();
        const result = JSON.parse(raw);
        res.json(result);
    } catch (err) {
        console.error('Moderation error:', err.message);
        res.json({ approved: true });
    }
});

//------------------------------SERVER------------------------------------

const PORT = 5000;
sequelize.sync()
    .then(() => {
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error('Failed to connect to database:', err));

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});