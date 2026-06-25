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
    online: {                          // ← new field
        type: DataTypes.BOOLEAN,
        defaultValue: false,            // new users start offline by default
    },
    profile_picture: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: '../../Assets/user_icon.png',
    },
});

module.exports = User;