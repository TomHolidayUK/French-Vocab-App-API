const mongoose = require('mongoose');
const vocabulary = require('./Vocabulary.js');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  entries: { type: Number, default: 0 },
  joined: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  incorrect: { type: Number, default: 0 },
  words: { type: Array, default: vocabulary },
  attempts: { type: Number, default: 0 },
  // Add other fields as needed
});

const User = mongoose.model('User', userSchema);

module.exports = User;