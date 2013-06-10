(function(exports) {

    function DesktopInput(game) {
        this.game = game;
        var ctx = this;

        // czeka na event myszy
        var canvas = document.getElementById('canvas');
        canvas.addEventListener('click', function(e) {

            ctx.onclick.call(ctx, e);
        });

        window.addEventListener('keydown', function(e) {

            ctx.onkey.call(ctx, e);
        });
        // JOIN button
        var join = document.getElementById('polacz');
        join.addEventListener('click', function(e) {

            ctx.onjoin.call(ctx, e);
        });


    }

    DesktopInput.prototype.onjoin = function() {
        if (!playerId) {
            smoke.prompt("Jaki wybierasz nick?", function(name) {
                if (name) {
                    socket.emit('join', {name: name});
                    document.querySelector('#join').style.display = 'none';
                } else {
                    smoke.signal('Proszę, podaj nick.');
                }
            });
        }
    };


    DesktopInput.prototype.onleave = function() {
        socket.emit('leave', {name: playerId});
    };

    DesktopInput.prototype.onclick = function(event) {
        // pozycja kliku
        var cx = event.clientX - event.target.getBoundingClientRect().left;
        var cy = event.clientY - event.target.getBoundingClientRect().top;
        // id gracza
        var player = this.game.state.objects[playerId];
        // jezeli nie ma gracza - nie orb nic
        if (!player) {
            return;
        }
        // jezeli gracz jest w pozycji
        var px = player.x;
        var py = player.y;
        // oblicz kąt wystrzału
        var angle = Math.atan2(cy - py, cx - px);
        // wyślij shoot
        socket.emit('shoot', {direction: angle});
    };

    DesktopInput.prototype.onkey = function(event) {
        var player = this.game.state.objects[playerId];
        var px = player.x;
        var py = player.y;
        var angle_left = 3;
        var angle_right = 0;
        var angle_down = 1.5;

        var angle_up = -1.5;


        switch (event.keyCode) {
            case 37:
                { // left
                    
                    socket.emit('shoot', {direction: angle_left});
                    break;
                }
            case 38:
                { // Up
                    socket.emit('shoot', {direction: angle_up});
                    break;
                }
            case 39:
                { // right
                    socket.emit('shoot', {direction: angle_right});
                    break;
                }
            case 40:
                { // Down
                    socket.emit('shoot', {direction: angle_down});
                    break;

                }

        }
    };

    exports.Input = DesktopInput;

})(window);
