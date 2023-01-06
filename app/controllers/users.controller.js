const user = require("../models/users.model");
const fs = require('mz/fs');
var mime = require('mime-types');
const path = require('path');
const crypto = require('crypto');



exports.register = async function( req, res ) {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const fakeEmail = email;
        const password = req.body.password;
        const city = req.body.city;
        const country = req.body.country;
        if (password == null || password.length == 0 || typeof(password) != 'string') {
            res.status(400).send("The password is invalid");
        }
        if (email == null || email.length < 3 || typeof(email) != 'string' || email.indexOf('@') == -1 || email.charAt(0) == "@" || email.charAt(email.length-1) == "@" || fakeEmail.replace(/[^@]/g, "").length > 1) {
            res.status(400).send("Invalid email");
        }
        if (name == null || name.length == 0 || typeof(name) != 'string') {
            res.status(400).send("The name field is required");
        }
        if (city != null && (city.length == 0 || typeof(city) != 'string')) {
            res.status(400).send("City field is wrong");
        }
        if (country != null && (country.length == 0 || typeof(country) != 'string')) {
            res.status(400).send("Country field is wrong");
        }
        const result = await user.register( name, email, password, city, country );
        if (result == 400) {
            res.status(400).send("email in use");
        }
        res.status( 201 )
            .send( {"userId": result});
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.login = async function(req, res) {
    try {
        const email = req.body.email;
        const fakeEmail = email;
        const password = req.body.password;

        if (email == null || email.length < 3 || typeof(email) != 'string' || email.indexOf('@') == -1 || email.charAt(0) == "@" || email.charAt(email.length-1) == "@" || fakeEmail.replace(/[^@]/g, "").length > 1) {
            res.status(400).send("Invalid email");
        }

        if (password == null || password.length == 0 || typeof(password) != 'string') {
            res.status(400).send("The password is invalid");
        }

        const result = await user.login( email, password );
        if (result == 400) {
            res.status(400).send("Email or password does not exist");
        }
        res.status( 200 )
            .send( result );
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.logout = async function(req, res) {
    try {
        const auth_token = req.headers['x-authorization'];
        const result = await user.logout( auth_token );
        if (result == 401) {
            res.status(401).send("You are unauthorised");
        }
        res.status( 200 )
            .send( "You are  now logged out" );
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.getUserInfo = async function(req, res) {
    try {
        const auth_token = req.headers['x-authorization'];
        const id = req.params.id;
        const result = await user.getUserInfo( auth_token, id );
        if (result == 404) {
            res.status(404).send("user not found")
        }
        res.status( 200 )
            .send( result[0][0] );
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.patchUser = async function(req, res) {
    try {
        const auth_token = req.headers['x-authorization'];
        const id = req.params.id;
        const name = req.body.name;
        const email = req.body.email;
        const fakeEmail = email;
        const password = req.body.password;
        const currentPassword = req.body.currentPassword;
        const city = req.body.city;
        const country = req.body.country;

        if (name == null && email == null && password == null && city == null && city == null && country == null) {
            res.status(400).send("No changes are provided");
        }
        if (name != null) {
            if (name.length == 0 || typeof(name) != 'string') {
                res.status(400).send("Invalid name");
            }
        }
        if (city != null) {
            if (city.length == 0 || typeof(city) != 'string') {
                res.status(400).send("Invalid city");
            }
        }
        if (country != null) {
            if (country.length == 0 || typeof(country) != 'string') {
                res.status(400).send("Invalid city");
            }
        }
        if (password == null || currentPassword == null) {
            res.status(401).send("No password was provided");
        }
        if (password.length == 0 || typeof(password) != 'string') {
            res.status(400).send("Invalid password");
        }
        if (currentPassword.length == 0 || typeof(currentPassword) != 'string') {
            res.status(400).send("Invalid currentPassword");
        }

        if ( email != null && (email.length < 3 || typeof(email) != 'string' || email.indexOf('@') == -1 || email.charAt(0) == "@" || email.charAt(email.length-1) == "@" || fakeEmail.replace(/[^@]/g, "").length > 1)) {
            res.status(400).send("Not right email format");
        }
        if (auth_token == null) {
            res.status(401).send("Auth toke is not valid");
        }
        const result = await user.patchUser( auth_token, name, password, currentPassword, email, city, country, id );
        if (result == 401) {
            res.status(401).send("Unauthorised");
        }
        if (result == 403) {
            res.status(403).send("Wrong user");
        }
        if (result == 400) {
            res.status(400).send("Invalid email");
        }
        if (result == 404) {
            res.status(404).send("User not found");
        }
        res.status( 200 )
            .send("SUCCESS");
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.getUserPhoto = async function(req, res) {
    try {
        const id = req.params.id;
        const result = await user.getPhotoModel(id);
        if (result == 404 || result == null) {
            res.status(404).send("Photo not found");
        }
        if (await fs.exists('./storage/photos/' + result)) {
            const photo = await fs.readFile('./storage/photos/' + result);
            const mimey = mime.lookup('./storage/photos/' + result);
            const dict = {photo, mimey};
            res.status(200).contentType(dict.mimey).send(dict.photo);
        }
    }catch (err) {
        res.status(500)
            .send("Internal Server Error");
    }
};

exports.putUserPhoto = async function(req, res) {
    try {
        const token = req.headers['x-authorization'];
        const content = req.headers['content-type'];
        const id = req.params.id;
        const image = req.body;
        let extension = mime.extension(content);
        if (extension == 'jpeg') {
            extension = 'jpg';
        }
        if (extension != 'jpg' && extension != 'png' && extension != 'gif') {
            res.status(400)
                .send("bad request");
        }
        const photo_name = "user" + id + "_" + crypto.randomBytes(8).toString('hex') + '.' + extension;
        const result = await user.putPhotoModel(token, id, photo_name);
        if (result == 401) {
            res.status(401).send("Unauthorised");
        }
        if (result == 403) {
            res.status(403).send("Forbidden");
        }
        if (result == 404) {
            res.status(404).send("Not found");
        }
        if (result == 201 || result == 200) {
            const photo_path = path.dirname(require.main.filename) + '/storage/photos/';
            fs.writeFileSync(photo_path+photo_name, image);
            if (result == 200) {
                res.status(200).send("Replaced the previous photo successfully");
            }
            if (result == 201) {
                res.status(201).send("Photo inserted successfully");
            }
        }
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

exports.deleteUserPhoto = async function(req, res) {
    try{
        const token = req.headers['x-authorization'];
        const id = req.params.id;
        const result = await user.deletePhoto( id, token );

        if (result == 404) {
            res.status(404).send("User not found");
        }
        if (result == 401) {
            res.status(401).send("Unauthorised");
        }
        if (result == 403) {
            res.status(403).send("Forbidden")
        }
        const photo_path = path.dirname(require.main.filename) + '/storage/photos/';
        fs.unlink(photo_path + result)
        return res.status(200).send("Users photo deleted");
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
};

exports.hash = async function(password) {
    const hashed_password = crypto.createHash('md5').update(password).digest('hex');
    return hashed_password;
};
