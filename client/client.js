document.addEventListener('DOMContentLoaded', function() {

    socket = io.connect('http://localhost:5050');
    game = new Game();
    playerId = null;
    totalSkew = 0;

    var renderer = new Renderer(game);
    var input = new Input(game);
    sound = new SoundManager();

    socket.on('start', function(data) {
        console.log('recv state', data);
        // wczytaj grę
        game.load(data.state);
        // Kalibracja gry na podstawie czasu rozgrywki
        var startDelta = new Date().valueOf() - data.state.timeStamp;
        // update set
        game.updateEvery(Game.UPDATE_INTERVAL, startDelta);

        // Rendering
        renderer.render();
        // Sprawdz nickname
        if (window.location.hash) {
            var name = window.location.hash.slice(1);
            socket.emit('join', {name: name});
            document.querySelector('#join').style.display = 'none';
        }
    });

    socket.on('state', function(data) {
        game.load(data.state);
    });

// nowy klient
    socket.on('join', function(data) {
        console.log('recv join', data);
        game.join(data.name);
        if (data.isme) {
            playerId = data.name;
            window.location.hash = '#' + data.name;
        }
    });

// klient wychodzi
    socket.on('leave', function(data) {
        console.log('recv leave', data);
        if (playerId == data.name) {
            gameover('Zjedzono cię. Jeszcze raz?');
        }
        game.leave(data.name);
    });

// klient/gracz strzela
    socket.on('shoot', function(data) {
        console.log('recv shoot', data.timeStamp, (new Date()).valueOf());
        // sprawdź, czy żywy
        if (!game.blobExists(data.playerId)) {
            return;
        }
        // strzał - dźwięk
        sound.playBloop();
        game.shoot(data.playerId, data.direction, data.timeStamp);
    });

// czas synchro (wspolny)
    socket.on('time', function(data) {
        // oblicz roznice synchronizacji
        var updateDelta = data.lastUpdate - game.state.timeStamp;
        // zlicz roznice
        totalSkew += updateDelta;
        // jezeli za duzy desync, syncuj
        if (Math.abs(totalSkew) > Game.TARGET_LATENCY) {
            // wgraj przekalibrowany state klientowi
            socket.emit('state');
            totalSkew = 0;
        }

        // spekatorzy
        document.getElementById('observer-count').innerText =
                Math.max(data.observerCount - game.getPlayerMeternumber(), 0);
        document.getElementById('player-count').innerText = game.getPlayerCount();
        document.getElementById('average-lag').innerText = Math.abs(updateDelta);
    });

// Przy wygranym
    socket.on('victory', function(data) {
        if (playerId) {
            if (data.id == playerId) {
                gameover('Wygrałeś! Jeszcze raz?');
            } else {
                gameover(data.id + ' wygrał. Jeszcze raz?');
            }
        } else {
            gameover('game over. ' + data.id + ' wygrał. Jeszcze raz?');
        }
    });


    game.on('victory', function(data) {

    });
    game.on('dead', function(data) {

    });


    function gameover(msg) {
        smoke.confirm(msg, function(yes) {
            if (yes && playerId) {
                socket.emit('join', {name: playerId});
            } else {
                smoke.signal('watching mode');
                // button rejoin
                document.querySelector('#join').style.display = 'inline';
                playerId = null;
            }
            // Reload po restarcie
            socket.emit('state');
        });
    }

});
