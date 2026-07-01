const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    likes_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    media_url:  {
        type: DataTypes.STRING,
        allowNull: true
    },
    media_type: {
        type: DataTypes.STRING,
        allowNull: true
    },
}, {
    tableName: 'posts',
});

module.exports = Post;