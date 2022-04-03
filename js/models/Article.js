const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    articleTitle: {
        type: String,
        required: true
    },
    articleContent: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    imageName: {
        type: String,
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    createDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Article', articleSchema);