const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PostLike = sequelize.define('PostLike', {
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    post_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
}, {
    tableName: 'post_likes',
    timestamps: false,
    id: false,
});

module.exports = PostLike;