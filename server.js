var io = require('socket.io').listen(3000);
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

    osm.set('port', process.env.PORT || 5000);
    osm.use(express.favicon());
    osm.use(express.logger('dev'));
    osm.use(less({
        src: __dirname + '/client',
        compress: true
    }));
    osm.use(express.favicon(__dirname + '/client/images/favicon.ico'));
    osm.use(express.static(path.join(__dirname, 'client')));
});

var server = http.createServer(osm).listen(osm.get('port'), function() {
    console.log("Port serwera: " + osm.get('port'));
});

//nowy poziomm generator
var gen = new level.Generator({
    width: Game.WIDTH,
    height: Game.HEIGHT,
    maxSpeed: 0.3,
    maxRadius: 11,
    blobCount: 42
});

game.load(gen.generate());
//update co:
game.updateEvery(Game.UPDATE_INTERVAL);
var observerCount = 0;
var plcount = 0;
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
        // Jeżeli blob żyje
        if (!game.blobExists(playerId)) {
            return;
        }
        // Update gry po strzale
        game.shoot(playerId, data.direction);
        data.playerId = playerId;
        data.timeStamp = (new Date()).valueOf();
        // Strzał
        io.sockets.emit('shoot', data);
    });

    //state zapisz
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
        if (game.getPlayerMeternumber() >= 4) {
            //liczba max graczy.
            return;
        }
        playerId = game.join(data.name);
        data.timeStamp = new Date();
        // Broadcast o dołączeniu klienta
        socket.broadcast.emit('join', data);
        data.isme = true;
        plcount++;
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
            observerCount: observerCount,
            plcount: plcount
        });
    }, 2000);
});

// Przy śmierci gracza odłącz od gry.
game.on('dead', function(data) {
    io.sockets.emit('leave', {name: data.id, type: data.type, timeStamp: new Date()});
});

// Gdy ktoś wygra - resetuj klienty
game.on('victory', function(data) {
    console.log('Ktoś wygrał');
    io.sockets.emit('victory', {id: data.id});
    game.over();
    // reset po timeout
    setTimeout(function() {
        // reboot generuj mape
        game.load(gen.generate());
        // Restart
        game.updateEvery(Game.UPDATE_INTERVAL);
    }, Game.RESTART_DELAY);
});




