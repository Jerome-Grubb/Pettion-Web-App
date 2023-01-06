const user = require("../controllers/petitions.controller");

module.exports = function( app ) {
    app.route( app.rootUrl + '/petitions/categories' )
        .get(user.getCategories);
    app.route( app.rootUrl + '/petitions/:id' )
        .get(user.readPetitions)
        .patch(user.patchPetitions)
        .delete(user.deletePetitions);
    app.route( app.rootUrl + '/petitions' )
        .get(user.getPetitions)
        .post(user.postPetitions);
    app.route(app.rootUrl + '/petitions/:id/signatures')
        .get(user.getSignatures)
        .post(user.postSignatures)
        .delete(user.deleteSignatures);
    app.route(app.rootUrl + '/petitions/:id/photo')
        .get(user.getPetitionPhoto)
        .put(user.putPetitionPhoto);
};
