const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Friendship = sequelize.define('Friendship', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    friendId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

module.exports = Friendship;