const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('react_db', 'root', 'Diogo2004!', {
    host: 'localhost',
    dialect: 'mysql',
});

module.exports = sequelize;