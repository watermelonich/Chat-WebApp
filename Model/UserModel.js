const mongoose = require('mongoose');
const Joi = require('joi');

// Define your schema
const userSchema = new mongoose.Schema({
    first_name : {
        type : String,
        required : true
    },
    last_name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true,
        unique : true
    },
    password : {
        type : String,
        required : true
    },
    image : {
        type : String
    },
    status : {
        type : String
    },
    datetime : {
        type : Date,
        default : Date.now
    }
});

// Create a model
const User = mongoose.model('chatUser', userSchema);

// Define Joi schema for form data validation
const userValidationSchema = Joi.object({
    first_name : Joi.string().required().min(1),
    last_name : Joi.string().required().min(1),
    email : Joi.string().email().required(),
    password : Joi.string().min(6).required()
}).unknown(true);

const loginValidationSchema = Joi.object({
    email : Joi.string().email().required(),
    password : Joi.string().min(6).required()
});

const updateUserValidationSchema = Joi.object({
    first_name : Joi.string().min(1),
    last_name : Joi.string().min(1),
    email : Joi.string().email()
}).or('first_name', 'last_name', 'email').unknown(true);

module.exports = { User, userValidationSchema, loginValidationSchema, updateUserValidationSchema };
