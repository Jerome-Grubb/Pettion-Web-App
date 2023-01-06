const db = require('../../config/db');

exports.getAll = async function( sortBy, author, q, category ) {
    const conn = await db.getPool();
    if (q != null) {
        q = "%"+q+"%"
    } else {
        q = "%%"
    }
    let start_author;
    let end_author;
    if (author != null) {
        end_author = "%"+author;
        start_author = author+"%";
    } else {
        end_author = "%%";
        start_author = "%%";
    }
    if (category != null) {
        category = "%"+category+"%"
    } else {
        category = "%%"
    }
    const query = 'select Signature.petition_id as petitionId, Petition.title , Category.name as category, User.name as authorName, count(Signature.petition_id) as signatureCount from Signature join Petition on Signature.petition_id = Petition.petition_id join Category on Petition.category_id = Category.category_id join User on Petition.author_id = User.user_id where Petition.author_id like ? and Petition.author_id like ? and Petition.category_id like ? and Petition.title like ? group by Signature.petition_id ' + sortBy;
    const [ rows ] = await conn.query( query, [start_author, end_author, category, q] );

    return rows;
};

exports.readPetitions = async function(id) {
    const conn = await db.getPool();
    const query = 'select Petition.petition_id as petitionId, Petition.title, Petition.description, Petition.author_id as authorId, User.name as authorName, User.city as authorCity, User.country as authorCountry, count(Signature.petition_id) as signatureCount, Category.name as category, Petition.created_date as createdDate, Petition.closing_date as closingDate from Signature JOIN Petition on Signature.petition_id = Petition.petition_id JOIN User on User.user_id = Petition.author_id JOIN Category on Category.category_id = Petition.category_id WHERE Petition.petition_id = ? group by Signature.petition_id';
    const rows = await conn.query(query, [ id ]);
    return rows;
};

exports.postPetitions = async function(token, title, desc, category, created_date, closing) {
    const conn = await db.getPool();
    const getUser = 'select user_id from User where auth_token = ?';
    const user = await conn.query(getUser, [ token ]);
    if (user[0].length == 0) {
        return 401;
    }

    const insertPetitions = 'insert into Petition (title, description, author_id, category_id, created_date, closing_date) values (?, ?, ?, ?, ?, ?)';
    const petitions = await conn.query(insertPetitions, [title, desc, user[0][0].user_id, category, created_date, closing]);

    return petitions[0];
};

exports.patchPetitions = async function( token, id, newTitle, newDesc, newCategory, newClosing) {
    const conn = await db.getPool();
    const userQuery = 'select Petition.author_id from Petition where petition_id = ?';
    const res = await conn.query(userQuery, [ id ]);
    if (res[0].length == 0) {
        return 404;
    }

    const getToken = 'select User.user_id from User where auth_token = ?';
    const tok = await conn.query(getToken, [token]);
    if (tok[0].length == 0) {
        return 401;
    }

    const getUser = 'select author_id from Petition where petition_id = ?';
    const forbidden = await conn.query(getUser, [id]);
    if (forbidden[0][0].author_id != tok[0][0].user_id) {
        return 403
    }

    let date = Date();
    let newDate = new Date(newClosing);
    if (newClosing != null) {
        if (newDate <= date) {
            return 400;
        }
    }

    const findUser = 'select * from Petition where petition_id = ?';
    const foundUser = await conn.query(findUser, [id]);
    const oldTitle = foundUser[0][0].title;
    const oldDescription = foundUser[0][0].description;
    const oldCategory = foundUser[0][0].category_id;
    const oldClosing = foundUser[0][0].closing_date;

    const query = 'update Petition set title = IfNull(?, ?), description = IfNull(?, ?), category_id = IfNull(?, ?), closing_date = IfNull(?, ?) where petition_id = ?';
    const result = await conn.query(query, [newTitle, oldTitle, newDesc, oldDescription, newCategory, oldCategory, newClosing, oldClosing, id]);
    return result;
};

exports.deletePetitions = async function( id, token ) {
    const conn = await db.getPool();

    const userQuery = 'select Petition.author_id from Petition where petition_id = ?';
    const res = await conn.query(userQuery, [ id ]);
    if (res[0].length == 0) {
        return 404;
    }

    const getToken = 'select User.user_id from User where auth_token = ?';
    const tok = await conn.query(getToken, [token]);
    if (tok[0].length == 0) {
        return 401;
    }

    const findUser = 'select author_id from Petition where petition_id = ?';
    const user = await conn.query(findUser, [ id ]);
    if (user[0][0].author_id != tok[0][0].user_id) {
        return 403;
    }

    const query = 'delete from Petition where petition_id = ?';
    const result = await conn.query(query, [id]);
    return result;
};

exports.getCategories = async function() {
    const conn = await db.getPool();
    const query = 'select category_Id as categoryId, name from Category';
    const result = await conn.query(query);
    return result[0];
};

exports.getSignatures = async function( id ) {
    const conn = await db.getPool();
    const query = 'select Signature.signatory_id as signatoryId, User.name, User.city, User.country, Signature.signed_date as signedDate from User join Signature on User.user_id = Signature.signatory_id where Signature.petition_id = ? order by Signature.signed_date asc';
    const result = await conn.query(query, [id]);
    if (result[0].length == 0) {
        return 404;
    }
    return result[0];
};

exports.postSignatures = async function( id, token ) {
    const conn = await db.getPool();

    const check404 = 'select * from Petition where petition_id = ?';
    const check = await conn.query(check404, [id]);
    if (check[0].length == 0) {
        return 404;
    }

    const findUser = 'select User.user_id from User where auth_token = ?';
    const user = await conn.query(findUser, [ token ]);
    if (user[0].length == 0) {
        return 401;
    }

    const signed = 'select signatory_id from Signature where signatory_id = ? and petition_id = ?';
    const result = await conn.query( signed, [user[0][0].user_id, id]);
    if (result[0].length != 0){
        return 403;
    }
    const findPetition = 'select * from Petition where petition_id = ?';
    const res = await conn.query(findPetition, [id]);

    let date = new Date();
    if (res[0][0].closing_date <= date && res[0][0].closing_date != null) {
        return 403;
    }
    const insertPetition = 'insert into Signature (signatory_id, petition_id, signed_date) values (?, ?, ?)';
    const ins = await conn.query(insertPetition, [user[0][0].user_id, id, date]);
    return 201;
};

exports.deleteSignatures = async function( id, token ) {
    const conn = await db.getPool();

    const getPetitions = 'select * from Petition where petition_id = ?';
    const petitions = await conn.query(getPetitions, [ id ]);
    if (petitions[0].length == 0) {
        return 404;
    }

    const findUser = 'select User.user_id from User where auth_token = ?';
    const user = await conn.query(findUser, [ token ]);
    if (user[0].length == 0) {
        return 401;
    }
    const signed = 'select * from Signature where petition_id = ? and signatory_id = ?';
    const sig = await conn.query(signed, [id, user[0][0].user_id]);
    if (sig[0].length == 0) {
        return 403;
    }

    const haveCreated = 'select * from Petition where author_id = ? and petition_id = ?'
    const created = await conn.query(haveCreated, [user[0][0].user_id, id]);
    if (created[0].length != 0) {
        return 403;
    }

    const petition = 'select closing_date from Petition where petition_id = ?';
    const pet = await conn.query(petition, [id]);
    const date = new Date();
    if (pet[0][0].closing_date <= date && pet[0][0].closing_date != null) {
        return 403;
    }

    const del = 'delete from Signature where signatory_id = ? and petition_id = ?';
    const dele = await conn.query(del, [user[0][0].user_id, id]);

    return 200;
};

exports.getPhoto = async function(id) {
    const conn = await db.getPool();
    const photo_query = 'select photo_filename from Petition where petition_id = ?'
    const rows = await conn.query(photo_query, [id]);
    if (rows[0].length == 0) {
        return 404;
    }
    return rows[0][0].photo_filename;
};

exports.putPhoto = async function(token, id, photo_name) {
    const conn = await db.getPool();
    const is_found = 'select * from Petition where petition_id = ?';
    const found = await conn.query(is_found, [id]);
    if (found[0].length == 0) {
        return 404;
    }

    const signed_in = 'select user_id from User where auth_token = ?';
    const result = await conn.query(signed_in, [token]);
    if (result[0].length == 0) {
        return 401;
    }

    const is_forbidden = 'select author_id, petition_id from Petition where author_id = ? and petition_id = ?';
    const forbidden = await conn.query(is_forbidden, [result[0][0].user_id, id]);
    if (forbidden[0].length == 0) {
        return 403;
    }

    const find_photo = 'select photo_filename from Petition where petition_id = ?';
    const photo = await conn.query(find_photo, [id]);
    console.log(photo[0].length);
    if (photo[0].length == 0) {
        const post_photo = 'update Petition set photo_filename = ? where petition_id = ?';
        const post = await conn.query(post_photo, [photo_name, id]);
        return 201;
    }
    else if (photo[0].length == 1) {
        const put_photo = 'update Petition set photo_filename = ? where petition_id = ?';
        const put = await conn.query(put_photo, [photo_name, id]);
        return 200;
    }
};





