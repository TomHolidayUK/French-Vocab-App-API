// Import packages
const express = require('express'); // express is used to create the server
const bcrypt = require('bcryptjs'); // bcrypt is used to hash passwords
const cors = require('cors'); // cors is used to communicate between front and back end without problems
const textToSpeech = require('@google-cloud/text-to-speech'); // For Google Cloud Text-to-Speech API
const mongoDB = require('./config/mongoDB'); // For MongoDB
// const mongoose = require('mongoose');
const User = require('./models/User');
const vocabulary = require('./models/Vocabulary.js');

// For GPT endpoint
require('dotenv').config();


// Create app by running express
const app = express();

// Create middleware for parsing and cors (so we can communicate with server)
// app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(cors());


// Connect MongoDB database to server
mongoDB();

// Create basic route
app.get('/', (req, res) => {
    res.send(`it is working!`)
})


// ----------- MONGODB ROUTES ----------- //

// Add user to MongoDB database
app.post('/mongousers', async (req, res) => {
    try {
      const { name, email } = req.body;
      const newUser = new User({ name, email });
      await newUser.save();
      res.status(201).json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });


// get users
app.get('/mongousers/:userId', async (req, res) => {
try {
    const userId = req.params.userId;

    // Use the findById method to create a Query object
    const query = User.findById(userId);

    // Execute the query and handle the result
    const user = await query.exec();

    if (!user) {
    return res.status(404).json({ message: 'User not found' });
    }

    // Access specific fields in the user document
    const userDetails = {
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    userEntries: user.entries,
    userProgress: user.progress,
    userCorrect: user.correct,
    userIncorrect: user.incorrect,
    userWords: user.words,
    userAttempts: user.attempts,
    userJoined: user.joined,
    // ... other fields
    };

    // Respond with user details
    res.status(200).json(userDetails);
} catch (error) {
    console.error("Error finding user:", error);
    res.status(500).json({ message: 'Server Error' });
}
});

// Number of entries 
app.put('/mongoentries/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
    
        const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { entries: 1 } }, { new: true });
        
        if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
        }
    
        // res.status(200).json({ message: 'Entries incremented by 1', entries: updatedUser.entries });
        return res.json(updatedUser.entries)
    } catch (error) {
        console.error("Error updating:", error);
        res.status(500).json({ message: 'Server Error' });
    }
 })

 // Register Users with MongoDB DB
 app.post('/mongoregister', async (req, res) => {
    try {
      let { name, email, password } = req.body;
      if (!email || !name || !password) {
        return res.status(400).json('You have submitted invalid details')
    }
    // Hash the password using bcrypt
    const bcryptCostFactor = 10;
    const salt = await bcrypt.genSalt(bcryptCostFactor);
    const hash = await bcrypt.hash(password, salt);

    // Save the user with the hashed password
    const newUser = new User({ name, email, password: hash });
    await newUser.save();
    res.status(201).json(newUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });


  
// Register route
app.post('/mongosignin', async (req, res) => {
    // Check that emial and password are valid
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json('You have submitted invalid details')
    }

    try {
        // Find user by email
        const user = await User.findOne({ email });
    
        // Check if the user exists
        if (!user) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user) {
            console.log('user:', user)
        }
    
        // Compare the entered password with the hashed password in the database
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
            console.log('passwords match')
            return res.json(user);
            // return res.status(200).json({ message: 'Login successful' });
        } else {    
            console.log('passwords do not match')
            return res.status(401).json({ message: 'Invalid email or password' });
        }
    
      } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
      }
})

// Progress route with MongoDB
app.put('/mongoprogress/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('userid', userId)
        // Find the user by their ID
        const user = await User.findById(userId);
        console.log('user', user)
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Increase the progression value by 1
        user.progress += 1;

        // Save the updated user
        await user.save();
        console.log('Progression increased successfully')
        res.json(user.progress);
        console.log(user.progress)
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Progress route with MongoDB
app.get('/mongoreset/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('userid', userId)

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Reset progression
        user.progress = 0;
        user.correct = 0;
        user.incorrect = 0;
        user.attempts = 0;
        user.words = vocabulary;

        await user.save();
        console.log('Reset successfully')
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Increase the number of incorrect answers
app.put('/mongoincorrect/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('userid', userId)
        // Find the user by their ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Increase the progression value by 1
        user.incorrect += 1;

        // Save the updated user
        await user.save();
        console.log('Progression increased successfully')
        res.json(user.incorrect);
        console.log(user.incorrect)
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Increase attempts
app.put('/mongoattempts/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('userid', userId)
        // Find the user by their ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Increase the progression value by 1
        user.attempts += 1;

        // Save the updated user
        await user.save();
        console.log('Progression increased successfully')
        res.json(user.attempts);
        console.log(user.attempts)
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Update the list of words with repeats
app.post('/mongowords/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { words } = req.body;
        console.log('userid', userId)
        console.log('words', words)

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.words = words;

        await user.save();
        console.log('Words updated successfully')
        res.json(user.words);
        // console.log(user.words)
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});



// ----------- API ROUTES ----------- //


app.post('/chatgpt', (req, res) => {
    const receivedText = req.body.question; 
    // console.log('Received Text:', receivedText);

    const OpenAI = require('openai');

    const openai = new OpenAI({
        apiKey: process.env.GPT_API_KEY,
    });
    
    const chatCompletion = openai.chat.completions.create({
        messages: [{ role: "user", content: receivedText }],
        model: "gpt-3.5-turbo",
    }).then((response) => {
        // console.log(response.choices[0].message.content);
        res.json(response.choices[0].message.content)
    })
})

// Need to create a filepath for the environmental variables where the API keys are stored
const keyData = process.env.KEYFILENAME2;
const fs = require('fs');
const tempFilePath = './temp-key-file.json';
fs.writeFileSync(tempFilePath, keyData);

// Create client with API keys path
const client = new textToSpeech.TextToSpeechClient({
    keyFilename: tempFilePath,
    projectId: 'direct-album-395018',
  });

app.get('/synthesize-speech', async (req, res) => {
    try {
        const { text } = req.query;
        console.log('test', req.query)
        const request = {
          input: { text },
          voice: { languageCode: 'fr-FR', ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3' },
        };
  
      const [response] = await client.synthesizeSpeech(request);
      // Send the synthesized audio data as a response
      res.send(response.audioContent);
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      res.status(500).send(`Internal server error. 1 = ${client.keyFilename}, 2 = ${process.env.KEYFILENAME}, 3 = ${client.projectId}`);
    }
  });




// Create a listen 
// app.listen(3000, ()=> {
//     console.log('app is running on port 3000'); 
// })
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})


// Plan of routes 
// /signin --> POST = success/fail
// /register --> POST = user 
// /profile/:userid --> GET user (for custom setup page)
// /progress --> PUT --> user
// ...

// Security
// We add the user's password to a POST request and send over HTTPS so that it is encrypted
// We store the password as a hash using bcrypt with a cost factor of 10