var app = require("express").createServer(),
	io = require("socket.io").listen(app),
	MessageContainer = require("./MessageContainer.js").MessageContainer;


app.configure(function(){
	app.use(app.router);
});
app.get('/lib/:file', function(req, res){
    res.sendfile(__dirname + "/lib/" + req.params.file);
});
app.get("/", function(req, res){
	res.sendfile(__dirname + "/index.html");
});

app.listen(10080);
MessageContainer.init(io);
	