const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PostShare = sequelize.define('PostShare', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    post_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    shared_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    shared_with_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'PostShares',
    timestamps: false,
});


module.exports = PostShare;

