const mongoose = require('mongoose'); // The mongoose module provides the necessary tools to interact with the MongoDB database
const dotenv = require('dotenv'); // the dotenv module helps load environment variables from a .env file.

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;

// Connect to MongoDB database
const mongoDB = async () => {
    try {
        const con = await mongoose.connect( MONGODB_URL )
        console.log(`MongoDB connected: ${con.connection.host}`);
    } catch (error) {
        console.error( error);
        // process.exit(1);
    }
}

module.exports = mongoDB; // export the connectDB function to be used in the server.js file