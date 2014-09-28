var app = require('http').createServer(handler)
	, io = require('socket.io').listen(app)
	, fs = require('fs')
	, mongo = require('./mongo.js')
	, uuid = require('node-uuid')
	, S = require('string');

io.set('close timeout', 300);  io.set('heartbeat timeout', 60);  
io.set('heartbeat interval', 120); 
io.set('transports', ['websocket', 'flashsocket', 'xhr-polling', 'htmlfile', 'polling']); 

mongo.connect( 'mongodb://127.0.0.1:27017/beta1', function (db) {
		console.log("Connected to Mongo...");
});

function getDateTime() {

    var date = new Date();

    var hour = date.getHours() % 12;
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return month + "/" + day + "/" + year + " " + hour + ":" + min + ":" + sec;

}

app.listen(80);

function handler (req, res) {
	var url = req.url;
	if(url == "/")
		url = "/index.html";
	var file = "/res" + url;

	fs.readFile(__dirname + file,
	function (err, data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}

		res.writeHead(200);
		res.end(data);
	});
}

/*
Example message:

{
	msg: "text",
	date: "MM/DD/YYYY HH:MM:SS",
	uid: "AASJDAKDJAKJ",
	pid: "ASKDJADSAJDSKAD",
	score: 0
}

*/

sockets = []

io.sockets.on('connection', function (socket) {
	var _id = "";
	var posts = mongo.collection('posts');
	var votes = mongo.collection('votes');



	socket.on('myid', function (data) {
		_id = data["uid"];
	});

	socket.on('getid', function (data) {
		_id = "uid=" + uuid.v4() + ";";
		socket.emit('indentifier', { cookie: _id });
	});

	socket.on('request', function (data) {
		if(data["sort"] == "recent") {
			var offset = data["offset"] ? data["offset"] : 0;
			posts.find().sort({ _id : -1 }).skip(offset).limit(20).toArray(function(err, results) {
				var result;
				var tosend = [];
				for(var i = 0; i < results.length; i++) {
					result = results[i];
					
					delete result["uid"];
					delete result["_id"];

					tosend.push(result);
				}
				socket.emit('loadmore', tosend);
			});
		}
		else {
			if(data["sort"]) {
				var offset = data["offset"] ? data["offset"] : 0;
				posts.find().sort({ score : -1 }).skip(offset).limit(20).toArray(function(err, results) {
					var result;
					var tosend = [];
					for(var i = 0; i < results.length; i++) {
						result = results[i];
						
						delete result["uid"];
						delete result["_id"];

						tosend.push(result);
					}
					socket.emit('loadmore', tosend);
				});
			}
		}
	});

	socket.on('upvote', function (data) {
		var pid = data['pid'];
		votes.find({ pid: pid, uid: _id }).toArray(function (err, data) {
			if(data.length == 0) {
				votes.insert({ pid: pid, uid: _id }, function (err, docs) {
					if(!err) {
						posts.update( { pid: pid }, { $inc: { score: 1 } }, function (err, docs) {
							if(!err)
								io.sockets.emit('updateMessage', { pid: pid, score: 1 })
						});
					}
				});
			}
		});

	});

	socket.on('downvote', function (data) {
		var pid = data['pid'];
		votes.find({ pid: pid, uid: _id }).toArray(function (err, data) {
			console.log(data);
			if(data.length == 0) {
				votes.insert({ pid: pid, uid: _id }, function (err, docs) {
					if(!err) {
						posts.update( { pid: pid }, { $inc: { score: -1 } }, function (err, docs) {
							if(!err)
								io.sockets.emit('updateMessage', { pid: pid, score: -1 })
						});
					}
				});
			}
		});

	});



	socket.on('new', function (data) {
		var msg = S(data['msg']).stripTags().s;
		var inp = {
					msg: msg, 
					date: getDateTime(),
					uid: _id,
					pid: uuid.v4(),
					score: 0
				  };
		var send = {
			msg: inp['msg'],
			date: inp['date'],
			pid: inp['pid'],
			score: inp['score']
		};
		if(msg.length > 0 && msg.length <= 200) {
			io.sockets.emit('add', send);
			posts.insert(inp, function(err, docs){
				if(err) throw err;
			});
		}
	});
});
