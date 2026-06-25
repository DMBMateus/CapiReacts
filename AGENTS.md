# AGENTS.md - AI Agent Guidance

## Quick Architecture Overview

This is a **social media prototype** with a split-stack architecture:
- **Frontend**: React 19 + Material-UI (CRA + craco), running on port 3000
- **Backend**: Express.js + Sequelize ORM + MySQL, running on port 5000
- **Frontend→Backend**: Hardcoded fetch calls to `http://localhost:5000/api/*`

### Key Entity Model
- **Users**: Profile data (name, email, phone, gender, profile_picture, online status)
- **Friendships**: Many-to-many (bidirectional—each friend pair stored twice)
- **Posts**: User-generated content with timestamps
- **PostLikes**: Toggle system (tracks which users liked which posts)
- **PostShare**: Sharing posts with other users (stores who shared, to whom, and which post)

---

## Developer Workflows

### Start Development
```bash
# Terminal 1: Backend (port 5000)
cd backend
npm install  # First time only
node server.js

# Terminal 2: Frontend (port 3000)
cd react_project
npm install  # First time only
npm start
```

### Setup Database
- MySQL database: `react_db` with credentials in `backend/config/database.js`
- **⚠️ CRITICAL**: Credentials hardcoded (`root` / `Diogo2004!`) — only for local dev, never commit in production
- Sequelize auto-syncs schema on `server.js` startup via `sequelize.sync()`
- **No migrations**: Schema is defined in model files only

### Common Commands
- **Backend tests**: None configured (test script is stub)
- **Frontend tests**: `npm test` (runs React testing library in watch mode)
- **Frontend build**: `npm run build` → outputs to `build/`
- **File uploads**: Images uploaded to `backend/uploads/`, served at `/uploads/*`

---

## State Management & Context Patterns

**All global state uses React Context** (no Redux/Zustand):

```javascript
// backend/server.js line 17-19 show the app.js
export const ThemeContext = createContext();        // mode (light/dark)
export const FriendContext = createContext();       // friendsList, setFriendsList, openFriendDrawer
export const ProfileContext = createContext();      // current user ID
```

**Usage example** (Posts.js):
```javascript
const { profile } = useContext(ProfileContext);     // Current user ID
const { friendsList } = useContext(FriendContext);  // Friend list for share dialog
```

**Key constraint**: `friendsList` is initialized at `App.js` root level and passed down. Changes are instant (no re-fetch from API).

---

## Sequelize & Relationship Patterns

### Model Association Pattern
Models define associations **inline in `server.js`** (not in model files):

```javascript
// Example: Post belongs to User
Post.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Post, { foreignKey: 'user_id' });

// Many-to-many: Users ↔ Friendships ↔ Users
User.belongsToMany(User, {
    through: Friendship,
    as: 'friends',
    foreignKey: 'userId',
    otherKey: 'friendId',
});
```

### Bidirectional Friendship Pattern
Friendships are **stored twice** (A→B and B→A) for query simplicity:
```javascript
// Adding friend 1 and 2
await Friendship.bulkCreate([
    { userId: 1, friendId: 2 },  // 1's side
    { userId: 2, friendId: 1 },  // 2's side
]);
```

When removing, **delete both directions**:
```javascript
await Friendship.destroy({
    where: {
        [Op.or]: [  // ← Op imported from 'sequelize'
            { userId: userId, friendId: friendId },
            { userId: friendId, friendId: userId },
        ],
    },
});
```

### Query with Includes
```javascript
// Fetch posts with user data (see server.js:138)
const posts = await Post.findAll({
    include: {
        model: User,
        attributes: ['name', 'profile_picture', 'id'],  // ← SELECT only these columns
    }
});
```

---

## API Conventions & Patterns

### Endpoints Overview
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/users` | Create user |
| GET | `/api/users/:id` | Single user |
| GET | `/api/users` | All users |
| POST | `/api/users/:id/friends` | Add friend (bidirectional) |
| DELETE | `/api/users/:id/friends/:friendId` | Remove friend (both sides) |
| GET | `/api/posts/user/:userId` | Posts for user + share info |
| POST | `/api/posts` | Create post |
| PATCH | `/api/posts/:id/like` | Toggle like (returns new count + liked flag) |
| POST | `/api/posts/:id/share` | Share with user (validates no duplicates) |

### File Upload Pattern
```javascript
// Multer config generates filenames: `{basename}-{timestamp}{ext}`
app.post('/api/users/:id/profile_picture', upload.single('image'), ...)
// Uploaded file served at: GET http://localhost:5000/uploads/Profile_Pic_DiogoM-1782382991638.jpeg
```

---

## Frontend Component Structure

### File Organization
```
src/Components/
  ├── App.js              # Root: contexts, routing, theme
  ├── NavBar/             # Top navigation + Settings.js
  ├── Posts/              # Posts.js (feed), NewPost.js (compose)
  ├── Friends/            # Friends.js (list), AddFriend.js, SingleFriend.js
  ├── Banner/             # Animated banner (CTA to friends page)
Components_CSS/
  ├── App.css, Posts.css, NavBar.css, etc.  # 1:1 CSS per component
```

### Component Pattern: Drawer for Friend Details
```javascript
// App.js line 125-151: Friend profile shown in right-side Drawer
<Drawer anchor="right" open={Boolean(selectedFriend)} onClose={closeFriendDrawer}>
    <Profile {...friendProps} />
    {showRemoveFriendButton && <RemoveFriendButton />}
</Drawer>
```

### Sorting & Sharing Pattern (Posts.js)
1. Posts fetched from `/api/posts/user/:userId` → includes `isSharedWithUser` flag from backend
2. Shared posts **sorted to top** (line 193-197 in server.js)
3. Share dialog lists friends from `FriendContext.friendsList`

---

## Common Pitfalls & Gotchas

1. **Hardcoded backend URL**: `http://localhost:5000` everywhere in React code
   - Change requires find/replace across all files
   - Suggestion: Extract to `.env.local` (not currently done)

2. **Database credentials in code**: `backend/config/database.js` has plaintext password
   - Use `.env` file for local dev (already has dotenv in package.json)

3. **Friend toggle on/offline**: `User.online` field exists but not used in any API route
   - Likely incomplete feature

4. **No error boundary**: React components don't have try/catch for failed API calls
   - Errors logged to console but user may not see them

5. **CSS overwrites**: MUI theme set once in App.js but individual component CSS can override
   - Avoid important! flags, use MUI's `sx` prop instead

6. **Post share prevents duplicates**: Backend checks `where: { post_id, shared_with_user_id }` before creating
   - Frontend should also disable button after sharing (not currently verified)

---

## Key File Reference for Pattern Examples

| Pattern | File | Lines |
|---------|------|-------|
| Context setup | `src/Components/App.js` | 17-19, 107-155 |
| Sequelize models | `backend/models/*.js` | All |
| Associations | `backend/server.js` | 70-81, 132-133 |
| Bidirectional delete | `backend/server.js` | 109-127 |
| Like toggle | `backend/server.js` | 259-286 |
| File upload | `backend/server.js` | 29-40, 218-237 |
| Post sharing | `backend/server.js` | 301-343 |
| Posts with sharing | `react_project/src/Components/Posts/Posts.js` | 21-49, 151-203 |

---

## When Making Changes

- **New API endpoint?** Add to `backend/server.js` (no separate routes folder)
- **New model?** Create in `backend/models/`, define associations in `server.js`
- **Update frontend state?** Use Context if global, useState if local
- **Add component?** Create folder in `src/Components/`, add matching CSS file
- **Database schema?** Modify model definition; Sequelize syncs automatically on restart

