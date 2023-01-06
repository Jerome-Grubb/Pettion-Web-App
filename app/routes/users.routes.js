const user = require("../controllers/users.controller");

module.exports = function( app ) {
    app.route( app.rootUrl + '/users/register' )
        .post(user.register);
    app.route( app.rootUrl + '/users/login' )
        .post(user.login);
    app.route( app.rootUrl + '/users/logout' )
        .post(user.logout);
    app.route( app.rootUrl + '/users/:id' )
        .get(user.getUserInfo)
        .patch(user.patchUser);
    app.route( app.rootUrl + '/users/:id/photo')
        .get(user.getUserPhoto)
        .put(user.putUserPhoto)
        .delete(user.deleteUserPhoto);
};
