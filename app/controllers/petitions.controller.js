const user = require("../models/petitions.model");
const fs = require('mz/fs');
var mime = require('mime-types');
const path = require('path');
const crypto = require('crypto');

exports.getPetitions = async function( req, res ) {
    try {
        let startIndex = req.query.startIndex;
        let count = req.query.count;
        const q = req.query.q;
        const categoryId = req.query.categoryId;
        const authorId = req.query.authorId;
        let sortBy = req.query.sortBy;

        if (sortBy != null) {
           if (sortBy != "SIGNATURES_DESC" && sortBy != "SIGNATURES_ASC" && sortBy != "ALPHABETICAL_DESC" && sortBy != "ALPHABETICAL_ASC") {
                 res.status(400).send("data.sortBy should be equal to one of the allowed values")
             }
        }

        if (sortBy == "ALPHABETICAL_ASC") {
            sortBy = "order by title asc";
        }
        else if (sortBy == "ALPHABETICAL_DESC") {
            sortBy = "order by title desc";
        }
        else if (sortBy == "SIGNATURES_ASC") {
            sortBy = "order by signatureCount asc";
        }
        else if (sortBy == "SIGNATURES_DESC" || sortBy == null) {
            sortBy = "order by signatureCount desc";
        }
        if (startIndex != null) {
            if (isNaN(startIndex) == true || startIndex.length == 0) {
                res.status(400).send("Invalid start index")
            }
        }
        if (count != null) {
            if (isNaN(count) || count.length == 0) {
                res.status(400).send("Invalid count")
            }
        }
        if (categoryId != null) {
            if (categoryId < 0 || categoryId > 7 || categoryId.length == 0) {
                res.status(400).send("Invalid category Id");
            }
            if (isNaN(categoryId)) {
                res.status(400).send("data.categoryId should be integer");
            }
        }
        if (authorId != null) {
            if (authorId.length == 0) {
                res.status(400).send("data.authorId should be integer");
            }
        }
        if (q != null) {
            if (q.length < 1) {
                res.status(400).send("data.q should NOT be shorter than 1 characters");
            }
        }
        startIndex = parseInt(startIndex);
        count = parseInt(count);
        const result = await user.getAll(sortBy, authorId, q, categoryId);
        if (isNaN(startIndex) == true) {
            startIndex = 0;
        }
        const endPoint = startIndex + count;
        if (isNaN(count) == true) {
            res.status( 200 )
                .send( result.slice(startIndex) );
        } else {
            res.status( 200 )
                .send( result.slice(startIndex, endPoint) );
        }
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.readPetitions = async function(req, res) {
    try {
        const id = req.params.id;
        const result = await user.readPetitions( id );
        if (result[0].length == 0) {
            res.status(404).send("Page not found");
        }
        res.status( 200 )
            .send( result[0][0] );
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.postPetitions = async function(req, res) {
    try {
        const title = req.body.title;
        const description = req.body.description;
        const category = req.body.categoryId;
        const closing = req.body.closingDate;

        const date = new Date();
        const closing_date = new Date(closing);
        console.log(typeof(description));
        if (title == null || description == null || category == null || closing_date == null || typeof(title) != 'string' || title.length == 0 || typeof(description) != 'string') {
            res.status(400).send("Invalid data entered");
        }
        if (closing != null) {
            if (closing_date <= date) {
                res.status(400).send("The closing date can not be before the created date");
            }
        }
        if (category < 1 || category > 7 || isNaN(category) || category.length == 0) {
            res.status(400).send("That is an invalid category");
        }

        const token =  req.headers['x-authorization'];
        const result = await user.postPetitions( token, title, description, category, date, closing );
        if (result == 401) {
            res.status(401).send("Unauthorised");
        }
        res.status( 201 )
            .send( {"petitionId": result.insertId} );
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.patchPetitions = async function(req, res) {
    try {
        const token =  req.headers['x-authorization'];
        const id = req.params.id;
        const title = req.body.title;
        const description = req.body.description;
        const category = req.body.categoryId;
        const closingDate = req.body.closingDate;

        if (title == null && description == null && category == null && closingDate == null) {
            res.status(400).send("All fields are null");
        }

        if (category != null) {
            if (category < 1 || category > 7 || isNaN(category)) {
                res.status(400).send("That is an invalid category");
            }
        }

        if (title != null) {
            if (title.length == 0 || typeof(title) != 'string') {
                res.status(400).send("Invalid title");
            }
        }

        if (description != null) {
            if (typeof(description) != 'string') {
                res.status(400).send("Invalid description");
            }
        }

        let currentDate = new Date();
        if (closingDate != null) {
            let date = new Date(closingDate);
            console.log(date);
            if (date < currentDate || isNaN(date)) {
                res.status(400).send("Invalid date");
            }
        }

        const result = await user.patchPetitions( token, id, title, description, category, closingDate );
        if (result == 401) {
            res.status(401).send("Unauthorised");
        }
        if (result == 403) {
            res.status(403).send("Forbidden");
        }
        if (result == 404) {
            res.status(404).send("Not found");
        }
        if (result == 400) {
            res.status(400).send("New closing date needs to be in the future");
        }
        res.status( 200 )
            .send( "SUCCESS" );
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.deletePetitions = async function(req, res) {
    try {
        const id = req.params.id;
        const token =  req.headers['x-authorization'];
        const result = await user.deletePetitions( id, token );
        if (result == 401) {
            res.status(401).send("Unauthorised");
        }
        if (result == 404) {
            res.status(404).send("Petition not found")
        }
        if (result == 403) {
            res.status(403).send("Forbidden");
        }
        res.status( 200 )
            .send( {"petitionId": result.insertId} );
    } catch( err ) {
        res.status( 500 )
            .send( `ERROR getting users ${ err }` );
    }
};

exports.getCategories = async function(req, res) {
    try {
        const result = await user.getCategories();
        res.status(200)
            .send(result);
    } catch(err) {
        res.status( 500 )
            .send(`ERROR getting users ${ err }`);
    }
};

exports.getSignatures = async function(req, res) {
    let petitionId;
    try {
        petitionId = req.params.id;
        const result = await user.getSignatures(petitionId);
        if (result == 404) {
            res.status(404).send("Petition not found");
        }
        res.status(200)
            .send(result);
    } catch (err) {
        res.status(500)
            .send(`ERROR getting users ${err}`);
    }
};


exports.postSignatures = async function(req, res) {
    let petitionId;
    try {
        petitionId = req.params.id;
        const token = req.headers['x-authorization'];

        const result = await user.postSignatures(petitionId, token);
        if (result == 403) {
            res.status(403).send("User has already signed this petition");
        }
        if (result == 401) {
            res.status(401).send("Unauthorised");
        }
        if (result == 404) {
            res.status(404).send("Petition not found");
        }
        res.status(201)
            .send(result);
    } catch (err) {
        res.status(500)
            .send(`ERROR getting users ${err}`);
    }
};

exports.deleteSignatures = async function(req, res) {
    let petitionId;
    try {
        petitionId = req.params.id;
        const token = req.headers['x-authorization'];

        const result = await user.deleteSignatures(petitionId, token);
        if (result == 403) {
            res.status(403).send("Forbidden");
        }
        if (result == 401) {
            res.status(401).send("Unauthorised");
        }
        if (result == 404) {
            res.status(404).send("Petition not found");
        }
        res.status(200)
            .send(result);
    } catch (err) {
        res.status(500)
            .send(`ERROR getting users ${err}`);
    }
};

exports.getPetitionPhoto = async function(req, res) {
    try {
        const id = req.params.id;
        const result = await user.getPhoto(id);
        if (result == 404) {
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

exports.putPetitionPhoto = async function(req, res) {
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
        const photo_name = "petition" + id + "_" + crypto.randomBytes(8).toString('hex') + '.' + extension;
        const result = await user.putPhoto(token, id, photo_name);
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
            // req.pipe(fs.createWriteStream(photo_path + photo_name));
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