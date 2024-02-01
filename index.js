require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Chroma Craft Server");
})

app.listen(port, () => {
    console.log(`Chroma Craft Server is running on port: ${port}`);
})
