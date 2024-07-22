const mongoose = require('mongoose');
const Joi = require('joi');

// Define the schema for chat_request collection
const chatRequestSchema = new mongoose.Schema({
    chat_request_sender_id : {
        type : String,
        required : true
    },
    chat_request_receiver_id : {
        type : String,
        required : true
    },
    chat_request_status : {
        type : String,
        enum : ['pending', 'accepted', 'rejected'],
        default : 'pending'
    }
});

// Create a model
const ChatRequest = mongoose.model('ChatRequest', chatRequestSchema);

module.exports = { ChatRequest };
