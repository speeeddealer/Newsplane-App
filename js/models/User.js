const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        min: 2,
        max: 100
    },
    lastName: {
        type: String,
        required: true,
        min: 2,
        max: 100
    },
    username: {
        type: String,
        required: true,
        min: 6,
        max: 25
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        min: 6,
        max: 1024
    },
    favourites: {
        type: Array
    },
    writenArticles: {
        type: Array
    },
    createDate: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        default: 'Newsplane. User'
    },
    profilePic: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model("User", userSchema);