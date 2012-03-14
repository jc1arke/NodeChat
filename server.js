var http = require('http'),
	sys = require('util'),
	fs = require('fs');

var server = http.createServer(function(req, res){
	fs.readFile('client.html', 'binary', function(err, data){
		if(err) {
			res.writeHead(500, {'Content-Type': 'text/html'});
			res.write(data + '\n');
			res.end();
			return;
		}

		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(data, 'binary');
		res.end();
	});
});

var port = process.evn['app_port'] || 8080;
server.listen(port);

var io = require('socket.io').listen(server),
	nicknames = [], text = undefined;

io.configure('production', function(){
	io.enable('browser client minification');	// send minified client
	io.enable('browser client etag');			// apply etag caching logic based on version number
	io.enable('browser client gzip');			// gzip the file
	io.set('log level', 1);						// reduce the logging

	io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
	io.set("polling duration", 10);
});

io.configure('development', function(){
	io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
	io.set("polling duration", 10);
});

io.sockets.on('connection', function(socket){

	socket.on('message', function(data){
		data = JSON.parse(data);

		if( data.log ) { // Log something
			log(data.log);
		} else if( data.command ) { // Command system
			switch(data.command) {
				case 'nickname':
					if (socket.nickname) {
						text = socket.nickname + ' is now known as ' + data.value;
				    	delete nicknames[data.value];
				    }
					nicknames[data.value] = socket.nickname = data.value;
					announce(socket, text || '<em><strong>' + data.value + '</strong> has entered the room</em>');
					break;
			}
		} else if( data.data ) { // Normal message
			if( socket.nickname ) {
				data.nickname = socket.nickname;
			} else {
				data.nickname = socket.id;
			}
			broadcast(socket, data);
		}
		
	});

	socket.on('nickname', function(nick){
		
	});

	socket.on('disconnnect', function(){
		log('Client ' + socket.id + ' disconnected');
	});
});

var log = function(data) {
	console.log(data);
}

var announce = function(socket, data) {
	console.log('Sending announcement to all clients', data);
	socket.broadcast.emit('announcement', data);
}

var broadcast = function(socket, data) {
	console.log('Transmitting to all clients', data);
	socket.broadcast.emit('message',JSON.stringify(data));
}
