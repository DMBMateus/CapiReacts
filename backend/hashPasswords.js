require('dotenv').config(); // ← add this as the first line
const bcrypt = require('bcrypt');
const User = require('./models/User');
const sequelize = require('./config/database');

sequelize.sync().then(async () => {
    const users = await User.findAll();
    for (const user of users) {
        if (user.password && !user.password.startsWith('$2b$')) {
            user.password = await bcrypt.hash(user.password, 10);
            await user.save();
            console.log(`Hashed password for user: ${user.name}`);
        }
    }
    console.log('Done hashing passwords.');
    process.exit();
});