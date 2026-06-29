const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    online: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    profile_picture: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: '../../Assets/user_icon.png',
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
});

module.exports = User;