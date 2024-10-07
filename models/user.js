const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['LIBRARIAN', 'MEMBER'], required: true },
    status: { type: String, enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE' },
    deletedBy: { type: String},
    booksBorrowed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    booksReturned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);