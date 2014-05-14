var currentLoad = "recent";
var offset = 0;
var socket = io.connect('http://' + window.location.host);
if(document.cookie.length > 0) {
	socket.emit('myid', { uid: document.cookie });
}
else {
	socket.emit('getid');
}
socket.emit('request', { sort: "recent", offset: 0 });
default_msg = "Type a 200 letter message here...";

function clearForm() {
	if(document.getElementById("messg").value == default_msg)
		document.getElementById("messg").value = "";
}

function resetForm() {
	if(document.getElementById("messg").value == "")
		document.getElementById("messg").value = default_msg;
}

function notification(msg) {
	document.getElementById("error").innerHTML = msg;
	window.setTimeout(function() {
		document.getElementById("error").innerHTML = "<br>";
	}, 3000);
}

function sortByTime() {
	clear();
	offset = 0;
	currentLoad = "recent";
	document.getElementById("footer").innerHTML = "Load More Posts";
	socket.emit('request', { sort: "recent", offset: 0 });
}

function sortByScore() {
	clear();
	currentLoad = "score";
	offset = 0;
	document.getElementById("footer").innerHTML = "Load More Posts";
	socket.emit('request', { sort: "score", offset: 0 });
}

function loadMore() {
	offset += 20;
	socket.emit('request', { sort: currentLoad, offset: offset });
}

function upvote(pid) {
	socket.emit('upvote', { pid: pid });
}

function downvote(pid) {
	socket.emit('downvote', { pid: pid });
}

function clear() {
	document.getElementById("messages").innerHTML = "";
}

function inputForm() {
	var msg = document.getElementById("messg").value;
	if(msg != default_msg) {
		if(msg.length > 0 && msg.length <= 200) {
			post( msg );
			document.getElementById("messg").value = default_msg;
		}
		else {
			notification("Messages must be between 0 - 200 characters.");
		}
	}
}
socket.on('indentifier', function (data) {
	document.cookie = data['cookie'];
});


function updateMessage(pid, score) {
	var elm = {};
	var elms = document.getElementById(pid).getElementsByTagName("*");
	for (var i = 0; i < elms.length; i++) {
		if (elms[i].className === "score") {
			elm = elms[i];
			break;
		}
	}
	elm.innerHTML = (parseInt(score) + parseInt(elm.innerHTML)).toString();
}

function addMessage(data) {
	console.log(data);
	var newMsg = "\
				<post id=\"" + data['pid'] + "\"> \
					<div class=\"vote\"> \
						<a onclick=\"upvote('" + data['pid'] + "')\"><div class=\"upvote\"></div></a> \
						<a onclick=\"downvote('" + data['pid'] + "')\"><div class=\"downvote\"></div></a> \
					</div> \
					<div class=\"score\">" + data['score'].toString() + "</div> \
					<div class=\"date\">" + data['date'] + "</div> \
					" + data['msg'] + " \
				</post>";
	messages.innerHTML = messages.innerHTML + newMsg;
}

socket.on('updateMessage', function (data) {
	updateMessage(data['pid'], data['score'])
});

socket.on('add', function (data) {
	addMessage(data);
});

socket.on('loadmore', function (data) {
	console.log(data);
	if(data[0] == undefined) {
		document.getElementById("footer").innerHTML = "All loaded.";
		return;
	}
	for(var i = 0; i < data.length; i++) {
		addMessage(data[i]);
	}
});

function post( message ) {
	socket.emit( 'new', { msg: message } );
}