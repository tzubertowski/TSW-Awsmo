(function(exports) {
// animacja
    window.requestAnimFrame = (function() {
        return  window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function(/* function */callback, /* DOMElement */element) {
                    window.setTimeout(callback, 1000 / 60);
                };
    })();

// renderer canvas
    var CanvasRenderer = function(game) {
        this.game = game;
        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');
    };

    CanvasRenderer.prototype.render = function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        var objects = this.game.state.objects;
        // z zapisu gry renderuj
        for (var i in objects) {
            var o = objects[i];
            if (o.dead) {
                if (o.type == 'player') {
                    console.log('player', o.id, 'died');
                }
            }
            if (o.r > 0) {
                this.renderObject_(o);
            }
        }

        var ctx = this;
        requestAnimFrame(function() {
            ctx.render.call(ctx);
        });
    };

    CanvasRenderer.prototype.renderObject_ = function(obj) {
        var ctx = this.context;
        var gradient = canvas.getContext("2d").createLinearGradient(0, 0, 170, 0);

        gradient.addColorStop(0, '#fbd4c9');
        gradient.addColorStop(0.2, '#e16c0f');
        gradient.addColorStop(0.4, '#d88500');
        gradient.addColorStop(0.6, '#fd4e00');
        gradient.addColorStop(0.8, '#ffe2d6');
        gradient.addColorStop(1.0, '#ff7100');

        var gradient2 = canvas.getContext("2d").createLinearGradient(0, 0, 170, 0);

        gradient2.addColorStop(0, '#affdfa');
        gradient2.addColorStop(0.2, '#2d726f');
        gradient2.addColorStop(0.4, '#26d6ce');
        gradient2.addColorStop(0.6, '#20b097');
        gradient2.addColorStop(0.8, '#2bdbf6');
        gradient2.addColorStop(1.0, '#ccf2f8');
        ctx.fillStyle = (obj.type == "player" ? gradient : gradient2);
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, obj.r, 0, 2 * Math.PI, true);
        ctx.closePath();
        ctx.fill();
        if (obj.type == 'player') {
            ctx.font = "8pt monospace";
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.fillText(obj.id, obj.x, obj.y);
        }

    };

    exports.Renderer = CanvasRenderer;

})(window);
