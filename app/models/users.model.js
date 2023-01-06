const db = require('../../config/db');
const crypto = require('crypto');

exports.register = async function( name, email, password, city, country ) {
    const conn = await db.getPool();
    const hashed_password = crypto.createHash('md5').update(password).digest('hex');
    const testEmail = 'select * from User where email = ?';
    const testy = await conn.query( testEmail, [email] );
    if (testy[0].length != 0) {
        return 400;
    }
    else {
        const query = 'insert into User (name, email, password, city, country) values ( ?, ?, ?, ?, ? )';
        const [rows] = await conn.query(query, [name, email, hashed_password, city, country]);
        return rows.insertId;
    }
};

exports.login = async function( email, password ) {
    const token = crypto.randomBytes(16).toString('hex');
    const hashed_password = crypto.createHash('md5').update(password).digest('hex');
    const conn = await db.getPool();
    const query = 'update User set auth_token = ? where email = ? and password = ?';
    const rows = await conn.query(query, [token, email, hashed_password]);
    if (rows[0].affectedRows == 0) {
        return 400;
    }
    const values = 'select user_id as userId, auth_token as token from User where auth_token = ?';
    const rows2 = await conn.query(values, [token]);
    return rows2[0][0];
};

exports.logout = async function(token) {
    const conn = await db.getPool();
    const query = 'update User set auth_token = null where auth_token = ?';
    const rows = await conn.query(query, [token]);
    if (rows[0].affectedRows == 0) {
        return 401;
    }
    return rows;
};

exports.getUserInfo = async function( token, id) {
    const conn = await db.getPool();

    const findUser = 'select user_id from User where user_id = ?';
    const userList = await conn.query(findUser, [id]);
    if (userList[0].length == 0) {
        return 404;
    }
    const find_token = 'select auth_token from User where user_id = ?';
    const result = await conn.query(find_token, [id]);

    if (token == result[0][0].auth_token && token != undefined) {
        const query = 'select name, city, country, email from User where user_id = ? and auth_token = ?';
        const rows = await conn.query(query, [id, token]);
        return rows;
    }
    const query = 'select name, city, country from User where user_id = ?';
    const rows = await conn.query(query, [id]);
    return rows;

};

exports.patchUser = async function(token, newName, newPassword, oldPassword, newEmail, newCity, newCountry, id) {
    const conn = await db.getPool();
    const hashedOldPassword = crypto.createHash('md5').update(oldPassword).digest('hex');
    const hashedNewPassword = crypto.createHash('md5').update(newPassword).digest('hex');
    const findUser = 'select * from User where user_id = ?';
    const user = await conn.query(findUser, [id]);
    if (user[0].length == 0) {
        return 404
    }
    const oldName = user[0][0].name;
    const oldEmail = user[0][0].email;
    const oldCity = user[0][0].city;
    const oldCountry = user[0][0].country;

    const testEmail = 'select * from User where email = ?';
    const testy = await conn.query( testEmail, [newEmail] );
    if (testy[0].length != 0 && testy[0][0].email != newEmail) {
        return 400;
    }

    const find_token = 'select user_id from User where auth_token = ?';
    const result = await conn.query(find_token, [token]);
    if (result[0].length == 0) {
        return 401;
    }

    const query_token = 'select auth_token from User where user_id = ? and password = ?';
    const token_res = await conn.query(query_token, [id, hashedOldPassword]);
    if (token_res[0].length == 0) {
        return 403;
    }

    const query = 'update User set name = IfNull(?, ?), password = IfNull(?, ?), email = IfNull(?, ?), city = IfNull(?, ?), country = IfNull(?, ?) where user_id = ?';
    const rows = await conn.query(query, [newName, oldName, hashedNewPassword, hashedOldPassword, newEmail, oldEmail, oldCity, newCity, oldCountry, newCountry, id]);

    return 200;
};

exports.getPhotoModel = async function(id) {
    const conn = await db.getPool();
    const getPhoto = 'select photo_filename from User where user_id = ?';
    const rows = await conn.query(getPhoto, [id]);
    if (rows[0].length == 0) {
        return 404;
    }
    return rows[0][0].photo_filename;
};

exports.putPhotoModel = async function(token, id, photo_name) {
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
    if (photo[0].photo_filename == null) {
        const post_photo = 'update User set photo_filename = ? where user_id = ?';
        const post = await conn.query(post_photo, [photo_name, id]);
        return 201;
    } else if (photo[0][0].photo_filename != null) {
        const put_photo = 'update User set photo_filename = ? where user_id = ?';
        const put = await conn.query(put_photo, [photo_name, id]);
        return 200;
    }
};
exports.deletePhoto = async function( id, token ){
    const conn = await db.getPool();
    const getPetitions = 'select * from User where user_id = ?';
    const petitions = await conn.query(getPetitions, [ id ]);
    if (petitions[0].length == 0) {
        return 404;
    }

    const findUser = 'select User.user_id from User where auth_token = ?';
    const user = await conn.query(findUser, [ token ]);
    if (user[0].length == 0) {
        return 401;
    }
    const signed = 'select * from User where user_id = ? and user_id = ?';
    const sig = await conn.query(signed, [id, user[0][0].user_id]);
    if (sig[0].length == 0) {
        return 403;
    }
    const get_photo = 'select photo_filename from User where user_id = ?';
    const photo_name = await conn.query(get_photo, [id]);
    const remove_photo = 'update User set photo_filename = NULL where user_id = ?';
    const remove = await conn.query(remove_photo, [id]);
    return photo_name[0][0].photo_filename;
};


