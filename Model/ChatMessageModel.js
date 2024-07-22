const mongoose = require('mongoose');
const Joi = require('joi');

// Define the schema for chat_request collection
const chatMessageSchema = new mongoose.Schema({
    chat_message_sender_id : {
        type : String,
        required : true
    },
    chat_message_receiver_id : {
        type : String,
        required : true
    },
    chat_message : {
        type : String,
        required : true
    },
    chat_message_status : {
        type : String,
        enum : ['No', 'Yes'],
        default : 'No'
    },
    chat_message_datetime : {
        type : Date,
        default : Date.now
    }
});

// Create a model

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { ChatMessage };