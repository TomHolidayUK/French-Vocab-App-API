// Import packages
const express = require('express'); // express is used to create the server
const bcrypt = require('bcryptjs'); // bcrypt is used to hash passwords
const cors = require('cors'); // cors is used to communicate between front and back end without problems
const knex = require('knex') // knex is used to connect with PostgreSQL database
const textToSpeech = require('@google-cloud/text-to-speech'); // For Google Cloud Text-to-Speech API
const mongoDB = require('./config/mongoDB'); // For MongoDB
const mongoose = require('mongoose');
const User = require('./models/User');
const vocabulary = require('./models/Vocabulary.js');

// For GPT endpoint
require('dotenv').config();

// Connect postesql database to server
// const db = knex({
//     client: 'pg',
//     connection: {
//     connectionString: process.env.DATABASE_URL,
//     ssl: {
//         rejectUnauthorized: false
//       }
//     }
// });




// Create local database
const local_db = {
    users: [
        {
            id: '1',
            name: 'John',
            email: 'john@gmail.com',
            password: 'cookies',
            entries: 0,
            joined: new Date(),
        },
        {
            id: '124',
            name: 'Sally',
            email: 'sally@gmail.com',
            password: 'bananas',
            entries: 0,
            joined: new Date(),
        },
    ]
}

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
    res.send('it is working!')
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
      res.status(500).send('Server Error');
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
// fs.writeFileSync(tempFilePath, keyData);

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

// ----------- POSTGRESQL ROUTES ----------- //

// Sign-in route
// app.post('/signin', (req, res) => {
//     const { email, password } = req.body;
//     if (!email || !password) {
//         return res.status(400).json('You have submitted invalid details')
//     }
//     // here we need to check the users login details are correct 
//     db.select('email', 'hash').from('login')
//         .where('email', '=', email)
//         .then(datamate => {
//             bcrypt.compare(password, datamate[0].hash, (err, isMatch) => {
//             if (err) {
//                     console.error(err);
//                 } else {
//                 if (isMatch) {
//                     // If isMatch is valid, return user details
//                     return db.select('*').from('users')
//                         .where('email', '=', email)
//                         .then(user => {
//                             console.log('Password is correct.')
//                             console.log(user);
//                             res.json(user[0]);
//                         })
//                         .catch(err => res.status(400).json('Unable to get user'))
//                 } else {
//                     // If isMatch is invalid...
//                     res.status(400).json('You have entered incorrect login details')
//                 }}
//             });
//         })
//         .catch(err => res.status(400).json('Wrong credentials'))
// })


// Local sign-in route
app.post('/signin', (req, res) => {
    if (req.body.email === local_db.users[0].email && req.body.password === local_db.users[0].password) {
        res.json(local_db.users[0]);
        } else {
          res.status(400).json('wrong credentials')
        }
  })

// Register route
app.post('/register', (req, res) => {
    // Add user data from body to the database of users
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
        return res.status(400).json('You have submitted invalid details')
    }
    // Hash the password using bcrypt
    const bcryptCostFactor = 10;
    bcrypt.genSalt(bcryptCostFactor, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            console.error('error with hashing:', err);
          } 
          else 
            {
                console.log('Hashed password:', hash);
                // We need to update the 'users' and 'login' database at the same time. We do this with transactions
                // Transactions work when we are doing multiple operations on one database to ensure that everything is updated 
                // In this transaction we first post to the 'login' database, we then return email and with this email we post to 'users'
                // We create a transaction when we need to do more than 2 things at once, we use trx instead of db to do all operations
                db.transaction(trx => {
                    trx.insert({
                        hash: hash,
                        email: email
                    })
                    .into('login')
                    .returning('email')
                    .then(loginEmail => {
                        // Post registered user to the database 'users'
                        return trx('users')
                            .returning('*') // With knex we use .returning() to return to the user everything that has been inserted
                            .insert({
                                email: email,
                                // email: loginEmail[0],
                                // email: loginEmail[0].email,
                                name: name,
                                joined: new Date()
                            })
                            // Update the users in the front end also
                            .then(user => {
                                res.json(user[0]) // Return recently registered user
                            })
                    })
                    // Finally we need to commit to add all of the above, if an error is caught we 'rollback': 
                    // we cancel the transaction and undo any changes that were made within that transaction
                    .then(trx.commit)
                    .catch(trx.rollback)
                })
                .catch(err => res.status(400).json('Unable to register')) 
            }
        });
    });
})

// Profile route - this could be used to grab and edit user info, for example update email address
app.get('/profile/:id', (req, res) => {
    // Check to see if the current user is in the database
    const { id } = req.params;
    
    // Select user from database. Use .where() to filter the user by id
    db.select('*').from('users').where({
        id: id
    }).then(user => {
        if (user.length) {
        res.json(user[0]);
    } else {
        res.status(400).json('User not found')
    }
    })
    .catch(err => res.status(400).json('Error getting user'))
})


// Progress route PostgreSQL
app.put('/progress', (req, res) => {
    const { id } = req.body;
    // If the id is verified, then update progress using increment()
    db('users').where('id', '=', id)
    .increment('progress', 1)
    .returning('progress')
    .then(progress => {
        res.json(progress[0])
        console.log(progress[0])
        // res.json(progress[0].progress)
    })
    .catch(err => res.status(400).json('Unable to get entries'))
})


// Number of entries 
app.put('/entries/:id', (req, res) => {
   // For a Specific user update the number of entries 
     const { id } = req.params; // here we're using the params but we could also use the body
    console.log(id)
     //  const { id } = req.body;
     let found = false;
     local_db.users.forEach(user => {
         if (user.id === id) {
            found = true;
             user.entries++
            //  res.json(`Number of entries for ${user.name} is: ${user.entries}`)
            return res.json(user.entries)
         } 
     })
     if (!found) {
         res.status(400).json('User not found')
     }
})

// Stats 
app.put('/stats', (req, res) => {
    res.send('this is working')
})







// Create a listen 
app.listen(3000, ()=> {
    console.log('app is running on port 3000'); 
})
// app.listen(process.env.PORT || 3000, () => {
//     console.log(`Server running on port ${process.env.PORT}`)
// })


// Plan of routes 
// /signin --> POST = success/fail
// /register --> POST = user 
// /profile/:userid --> GET user (for custom setup page)
// /progress --> PUT --> user
// ...

// Security
// We add the user's password to a POST request and send over HTTPS so that it is encrypted
// We store the password as a hash using bcrypt with a cost factor of 10