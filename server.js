/*jshint node: true */
var io = require('socket.io').listen(5050);
var gamejs = new require('./common/game.js');
var level = new require('./level/level.js');

var express = require('express');
var http = require('http');
var path = require('path');
var less = require('less-middleware');
var osm = express();
// instancja gry
var Game = gamejs.Game;
var game = new Game();

// HTTPek stoi //
osm.configure(function() {
    osm.set('port', process.env.PORT || 3000);
    osm.use(express.favicon());
    osm.use(express.logger('dev'));
    osm.use(less({
        src: __dirname + '/client',
        compress: true
    }));
    osm.use(express.static(path.join(__dirname, 'client')));
});

var server = http.createServer(osm).listen(osm.get('port'), function() {
    console.log("Port serwera: " + osm.get('port'));
});

//nowy poziomm generator
var gen = new level.Generator({
    width: Game.WIDTH,
    height: Game.HEIGHT,
    maxSpeed: 0.2,
    maxRadius: 13,
    blobCount: 14
});

game.load(gen.generate());

// Initialize the game loop
game.updateEvery(Game.UPDATE_INTERVAL);
var observerCount = 0;

// sockety, tu bedzie inicjalizowana gra
io.sockets.on('connection', function(socket) {
    observerCount++;
    // ID sledzimy z socketem
    var playerId = null;

    // Przy podłączeniu do gry zapisz grę
    socket.emit('start', {
        state: game.save()
    });

    //strzał
    socket.on('shoot', function(data) {
        console.log('recv shoot', data);
        // Check that the player is still alive
        if (!game.blobExists(playerId)) {
            return;
        }
        // Update the game game
        game.shoot(playerId, data.direction);
        data.playerId = playerId;
        data.timeStamp = (new Date()).valueOf();
        // Broadcast that shot was fired.
        io.sockets.emit('shoot', data);
    });

    //state save
    socket.on('state', function(data) {
        socket.emit('state', {
            state: game.save()
        });
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

    //sync klientow
    var timeSyncTimer = setInterval(function() {
        socket.emit('time', {
            timeStamp: (new Date()).valueOf(),
            lastUpdate: game.state.timeStamp,
            updateCount: game.updateCount,
            observerCount: observerCount
        });
    }, 2000);


});
 
 // Przy śmierci gracza odłącz od gry.
 game.on('dead', function(data) {
 io.sockets.emit('leave', {name: data.id, type: data.type, timeStamp: new Date()});
 });

// Gdy ktoś wygra - resetuj klienty
game.on('victory', function(data) {
    console.log('game victory event fired');
    io.sockets.emit('victory', {id: data.id});
    // Stop the game.
    game.over();
    // Wait a bit and then restart.
    setTimeout(function() {
        // Load a new level.
        game.load(gen.generate());
        // Restart the game.
        game.updateEvery(Game.UPDATE_INTERVAL);
    }, Game.RESTART_DELAY);
});




