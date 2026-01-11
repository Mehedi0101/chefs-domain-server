// external imports
const express = require('express');
const mongoose = require('mongoose');
// internal imports
const { Blog } = require('../models/blogs');
const blogRouter = express.Router();

// get all blogs from the database
blogRouter.get('/', async (req, res) => {
    try {
        const result = await Blog.find();
        res.send(result);
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch blogs' });
    }
});

// get blog by id
blogRouter.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send({ error: 'Invalid blog ID' });
        }

        const result = await Blog.findById(id);

        if (!result) {
            return res.status(404).send({ error: 'Blog not found' });
        }

        res.send(result);
    } catch (error) {
        res.status(500).send({ error: 'Failed to fetch blog' });
    }
});

module.exports = { blogRouter };