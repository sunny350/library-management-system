const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    author: { type: String, required: true },
    status: { type: String, enum: ['AVAILABLE', 'BORROWED'], default: 'AVAILABLE' },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Book', BookSchema);