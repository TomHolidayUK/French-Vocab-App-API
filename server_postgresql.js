const knex = require('knex') // knex is used to connect with PostgreSQL database


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


// ----------- POSTGRESQL ROUTES ----------- //

// Sign-in route
app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json('You have submitted invalid details')
    }
    // here we need to check the users login details are correct 
    db.select('email', 'hash').from('login')
        .where('email', '=', email)
        .then(datamate => {
            bcrypt.compare(password, datamate[0].hash, (err, isMatch) => {
            if (err) {
                    console.error(err);
                } else {
                if (isMatch) {
                    // If isMatch is valid, return user details
                    return db.select('*').from('users')
                        .where('email', '=', email)
                        .then(user => {
                            console.log('Password is correct.')
                            console.log(user);
                            res.json(user[0]);
                        })
                        .catch(err => res.status(400).json('Unable to get user'))
                } else {
                    // If isMatch is invalid...
                    res.status(400).json('You have entered incorrect login details')
                }}
            });
        })
        .catch(err => res.status(400).json('Wrong credentials'))
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

