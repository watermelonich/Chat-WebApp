const multer = require('multer');
const path = require('path');

// Multer storage configuration
const storage = multer.diskStorage({
    destination : function(req, file, cb){
        cb(null, 'uploads/');
    },
    filename : function(req, file, cb){
        const extension = path.extname(file.originalname);
        cb(null, Date.now() + extension);
    }
});

// Multer upload configuration

const upload = multer({
    storage : storage,
    limits : {
        fileSize : 1024 * 1024 * 5
    },
    fileFilter : function(req, file, cb){
        const allowedTypes = /jpeg|jpg|png/;
        const extensionName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if(extensionName){
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, JPG, and PNG files are allowed'), false);
        }

    }
}).single('image');

// Middleware to handle file upload
function handleFileUpload(request, response, next){
    upload(request, response, function(error){
        if(error){
            return response.status(400).json({ errors : [error.message] });
        }
        // File upload successful
        next();
    });
}

module.exports = { upload, handleFileUpload };