const mongoose = require('mongoose');

const DeletedBookSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    author: { type: String, required: true },
    status: { type: String, enum: ['AVAILABLE', 'BORROWED'], default: 'AVAILABLE' },
    deletedBy: {type:String},
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DeletedBook', DeletedBookSchema);