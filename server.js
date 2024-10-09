const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

app.get('/', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is healthy', uptime: process.uptime() });
});

app.use('/api', require('./routes/api'));

process.on('uncaughtException', (err)=>{
    console.error('Uncaught Exception:', err.message); 
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});