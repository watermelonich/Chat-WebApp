const express = require('express');
const mongoose = require('mongoose');
const { User, userValidationSchema, loginValidationSchema, updateUserValidationSchema }  = require('./Model/UserModel');
const { ChatRequest } = require('./Model/ChatRequestModel');
const { ChatMessage } = require('./Model/ChatMessageModel');

const { upload, handleFileUpload } = require('./uploadMiddleware');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended : true }));

mongoose.connect('mongodb+srv://mongodbbyjohnsmith:chvf2ekYrOjLg996@cluster0.ce6jjfh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

const connect = mongoose.connection;

connect.on('error', console.error.bind(console, 'MongoDB connection error:'));

connect.once('open', () => {
    console.log('Connected to MongoDB');
});

const secretKey = 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTcxMDMzNDI4NywiaWF0IjoxNzEwMzM0Mjg3fQ.qnwEgz0CoDnqlHA78-eGRngDENXEDJP3LYvL9YkMlCE';

app.get('/', async (request, response) => {
    response.sendFile(__dirname + '/index.html');
});

app.post('/register', handleFileUpload, async (request, response) => {
    try {
        if(!request.file){
            return response.status(400).json({ errors : ['No image selected.'] });
        }

        const validationResult = userValidationSchema.validate(request.body, { abortEarly : false });

        if(validationResult.error){
            const validationErrors = validationResult.error.details.map(error => error.message);
            response.status(400).json({ errors : validationErrors });
        } else {
            // Extract form data from request body
            const { first_name, last_name, email, password } = request.body;
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create new user object
            const newUser = new User({
                first_name,
                last_name,
                email,
                password : hashedPassword,
                image : request.file.filename,
                status : 'logout'
            });

            // Save user to the database
            await newUser.save();

            response.status(200).json({ message : 'Registration Completed' });
        }
    } catch(error){
        response.status(500).json({ errors : 'Internal server error.' });
    }
});

app.post('/login', async (request, response) => {
    try {
        const validationResult = loginValidationSchema.validate(request.body, { abortEarly : false });
        if(validationResult.error){
            let errorMessage = '';
            validationResult.error.details.map(error => {
                errorMessage += error.message + '<br />';
            });
            response.status(400).json({ error : errorMessage });
        } else {
            const { email, password } = request.body;

            // Retrieve the user record from the database based on the provided email
            const user = await User.findOne({ email });

            if(!user){
                // User not found
                return response.status(401).json({ error : 'Invalid email.' });
            }

            // Compare the hashed password stored in the database with the plaintext password provided during login
            const passwordMatch = await bcrypt.compare(password, user.password);

            if(!passwordMatch){
                // Passwords do not match
                return response.status(401).json({ error : 'Invalid password.' });
            }

            // Passwords match, generate authentication token
            const token = jwt.sign({ userId : user._id }, secretKey, { expiresIn : '1h' });

            user.status = 'login';

            await user.save();

            // Send the authentication token to the client
            response.status(200).json({ token });
        }
    } catch(error){
        response.status(500).json({ error : 'Internal server error' });
    }    
});

app.get('/chat', async (request, response) => {
    response.sendFile(__dirname + '/chat.html');
});

app.get('/setUserData', verifyToken, async (request, response) => {
    let userId = request.user.userId;
    let user = await User.findById(userId);
    response.status(200).json({ user });
});

app.post('/logout', async (request, response) => {
    const user_id = request.body.userId;
    const user = await User.findById(user_id);
    user.status = 'logout';
    await user.save();
    response.status(200).json({ success : 'done' });
});

app.put('/setting/:id', handleFileUpload, async (request, response) => {
    try {
        const validationResult = updateUserValidationSchema.validate(request.body, { abortEarly : false });

        if(validationResult.error){
            // Handle validation errors
            const validationErrors = validationResult.error.details.map(error => error.message);

            // Respond with the array of validation errors
            response.status(400).json({ errors : validationErrors });
        } else {
            const userId = request.params.id;

            // Fetch the user from the database
            const user = await User.findById(userId);

            user.first_name = request.body.first_name;
            user.last_name = request.body.last_name;
            user.email = request.body.email;
            let userImage = request.body.hidden_image;
            if(request.file){
                userImage = request.file.filename;
            }
            user.image = userImage;
            await user.save();
            // Send success response to the client
            response.status(200).json({ message : 'Data Save', image : userImage, name : user.first_name });
        }        
    } catch(error){
        console.log(error.message);
        response.status(500).json({ errors : 'Internal server error.' });
    }
});

app.post('/searchUser', async (request, response) => {
    let userId = request.body.id;
    let searchQuery = request.body.searchQuery;
    // Define the search query
    const query = {};
    let userData = [];
    query.$or = [
        {
            first_name : {
                $regex : searchQuery,
                $options : 'i'
            },
        },
        {
            last_name : {
                $regex : searchQuery,
                $options : 'i'
            }
        }
    ];
    try {
        // Execute the search query
        const users = await User.find(query);
        console.log(users);
        for(const user of users){
            if(user._id.toHexString() !== userId){
                let userDataObject = {
                    id : user._id,
                    first_name : user.first_name,
                    last_name : user.last_name,
                    image : user.image
                };
                userData.push(userDataObject);
            }
        }

        response.status(200).json(userData);
    } catch(error){
        response.status(500).json({ error : 'Internal Server Error' });
    }
});

app.post('/sendRequest', async (request, response) => {
    const { receiver_user_id, sender_user_id } = request.body;

    // Create new ChatRequest object
    const newChatRequest = new ChatRequest({
        chat_request_sender_id : sender_user_id,
        chat_request_receiver_id : receiver_user_id
    });

    // Save ChatRequest to the database
    await newChatRequest.save();

    response.status(200).json({ message : 'Request Send' });
});

app.post('/loadChatRequest', async (request, response) => {
    let chatRequestData = [];
    const { receiver_user_id } = request.body;
    let chatRequestResult = [];

    // Define the search query
    const query = {
        $and : [
            { chat_request_receiver_id : receiver_user_id },
            { chat_request_status : 'pending' }
        ]
    }; //chat_request_receiver_id = ${receiver_user_id} AND chat_request_status = 'pending'

    chatRequestResult = await ChatRequest.find(query);

    if(chatRequestResult.length > 0){
        const promises = chatRequestResult.map(chatRequest => getUserData(chatRequest.chat_request_sender_id));
        const userDataArray = await Promise.all(promises);
        for(let count = 0; count < userDataArray.length; count++){
            const userDataObject = {
                chat_request_id : chatRequestResult[count]._id,
                first_name : userDataArray[count].first_name,
                last_name : userDataArray[count].last_name,
                image : userDataArray[count].image
            };
            chatRequestData.push(userDataObject);
        }
    }

    response.status(200).json(chatRequestData);
});

app.put('/acceptRequest/:id', async (request, response) => {
    const chat_request_id = request.params.id;

    // Fetch the Chat Request Data from the database
    const chatRequest = await ChatRequest.findById(chat_request_id);
    chatRequest.chat_request_status = 'accepted';
    await chatRequest.save();
    response.status(200).json({ success : 'done' });
});

app.post('/loadConnectedUser', async (request, response) => {
    let connectedUserData = [];
    let user_id = request.body.user_id;

    // Define the search query
    const query = {
        $and : [
            {
                $or : [
                    {
                        chat_request_sender_id : user_id
                    },
                    {
                        chat_request_receiver_id : user_id
                    }
                ]
            },
            {
                chat_request_status : 'accepted'
            }
        ]
    };

    const chatRequestResult = await ChatRequest.find(query);

    if(chatRequestResult.length > 0){
        const promises = chatRequestResult.map(chatRequest => {
            let otherUserId = '';
            if(chatRequest.chat_request_sender_id !== user_id){
                otherUserId = chatRequest.chat_request_sender_id;
            }
            if(chatRequest.chat_request_receiver_id !== user_id){
                otherUserId = chatRequest.chat_request_receiver_id;
            }
            return getUserData(otherUserId);
        });
        const userDataArray = await Promise.all(promises);

        userDataArray.forEach(userData => {
            const userDataObject = {
                id : userData._id,
                first_name : userData.first_name,
                last_name : userData.last_name,
                image : userData.image,
            };
            connectedUserData.push(userDataObject);
        });
    }
    response.status(200).json(connectedUserData);
});

app.post('/sendChat', async (request, response) => {
    // Create new Chat Message object
    const chatMessage = new ChatMessage({
        chat_message_sender_id : request.body.sender_user_id,
        chat_message_receiver_id : request.body.receiver_user_id,
        chat_message : request.body.msg
    });

    // Save Chat Message to the database
    await chatMessage.save();

    response.status(200).json({ success : 'done' });
});

app.post('/fetchChat', async (request, response) => {
    const { sender_user_id, receiver_user_id } = request.body;

    // Define the search query
    const query = {
        $or : [
            {
                $and : [
                    {
                        chat_message_sender_id : sender_user_id
                    },
                    {
                        chat_message_receiver_id : receiver_user_id
                    }
                ]
            },
            {
                $and : [
                    {
                        chat_message_sender_id : receiver_user_id
                    },
                    {
                        chat_message_receiver_id : sender_user_id
                    }
                ]
            }
        ]
    };

    // If chat_message_datetime is provided, include it in the query
    if(request.body.last_chat_datetime){
        query.chat_message_datetime = { $gt : new Date(request.body.last_chat_datetime) };
    }

    const chatData = await ChatMessage.find(query).sort({ chat_message_datetime : 1 });

    let chatDataArray = [];

    let receiverUserData = await getUserData(receiver_user_id);

    chatData.forEach(chat => {
        let chatAction = 'Receive';
        if(chat.chat_message_sender_id === sender_user_id){
            chatAction = 'Send';
        }
        chatDataArray.push({
            receiver_first_name : receiverUserData.first_name,
            receiver_last_name : receiverUserData.last_name,
            receiver_image : receiverUserData.image,
            message : chat.chat_message,
            chatAction : chatAction,
            datetime : chat.chat_message_datetime
        });
    });

    response.status(200).json(chatDataArray);
});

function verifyToken(request, response, next)
{
    const token = request.headers.authorization;

    if(!token){
        return response.status(401).json({ error : 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        request.user = decoded;
        next();
    } catch(error) {
        response.status(401).json({ error : 'Invalid token' });
    }
}

async function getUserData(id){
    const user = await User.findById(id);
    return user;
}

app.listen(PORT, () => {
    console.log(`Chat Application run on Port No. ${PORT}`);
});