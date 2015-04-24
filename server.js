//Web app launch
// require the restify library.
var restify = require('restify'),
// create an HTTP server.
server = restify.createServer();
// add a route that listens on http://localhost:5000/hello/world
server.get('/hello', function (req, res, cb) {
  res.send("Hello World!");
  return cb();
});
server.listen(process.env.PORT || 5000, function () { // bind server to port 5000.
  console.log('%s listening at %s', server.name, server.url);
});
