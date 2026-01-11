const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        author: {
            type: String,
            required: true
        },
        cover: {
            type: String,
        },
        date: {
            type: String,
            required: true
        },
        description: {
            type: String,
        }
    }
)

const Blog = mongoose.model("blog", blogSchema);

module.exports = { Blog };