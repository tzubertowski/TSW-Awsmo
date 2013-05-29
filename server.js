/*jshint node: true */
var io = require('socket.io').listen(5050);
var gamejs = new require('./common/game.js');


var express = require('express');
var http = require('http');
var path = require('path');
var less = require('less-middleware');
var osm = express();
// instancja gry
var Game = gamejs.Game;

// HTTPek stoi //
osm.configure(function () {
    osm.set('port', process.env.PORT || 3000);
    osm.use(express.favicon());
    osm.use(express.logger('dev'));
    osm.use(less({
        src: __dirname + '/client',
        compress: true
    }));
    osm.use(express.static(path.join(__dirname, 'client')));
});

var server = http.createServer(osm).listen(osm.get('port'), function () {
    console.log("Port serwera: " + osm.get('port'));
});




// sockety, tu bedzie inicjalizowana gra
io.sockets.on('connection', function(socket) {
	observerCount++;
	// ID sledzimy z socketem
	var playerId = null;

	// Przy podłączeniu do gry zapisz grę
	socket.emit('start', {
	state: game.save()
	});

		socket.on('join', function(data) {
		console.log('recv join', data);
		if (game.blobExists(data.name)) {
		  // Nie pozwalaj na te same nazwy graczy
		  return;
		}
		if (game.getPlayerCount() >= 4) {
		  //liczba max graczy.
		  return;
		}
		playerId = game.join(data.name);
		data.timeStamp = new Date();
		// Broadcast o dołączeniu klienta
		socket.broadcast.emit('join', data);
		data.isme = true;
		socket.emit('join', data);
	});


	socket.on('leave', function(data) {
		console.log('recv leave', data);
		observerCount--;
		game.leave(playerId);
		data.timeStamp = new Date();
		// Broadcast o wyjściu klienta
		io.sockets.emit('leave', data);
	});

	socket.on('disconnect', function(data) {
		console.log('recv disconnect', data);
		observerCount--;
		game.leave(playerId);
		// jak gracz, to wyszedl, jak obserwator to jedynie -- obserwator
		if (playerId) {
		  socket.broadcast.emit('leave', {name: playerId, timeStamp: new Date()});
	}




});
	// Przy śmierci gracza odłącz od gry.
	game.on('dead', function(data) {
		io.sockets.emit('leave', {name: data.id, type: data.type, timeStamp: new Date()});
	});

});



