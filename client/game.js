(function(exports) {
    var Game = function() {
        this.state = {};
        this.oldState = {};

        // Ostatni id
        this.lastId = 0;
        this.callbacks = {};

        this.updateMeternumber = 0;
        // Timer dla petli updatujacej
        this.timer = null;
    };

    Game.UPDATE_INTERVAL = Math.round(1000 / 30);
    Game.MAX_DELTA = 10000;
    Game.WIDTH = 640;
    Game.HEIGHT = 480;
    Game.SHOT_AREA_RATIO = 0.02;
    Game.SHOT_SPEED_RATIO = 1;
    Game.PLAYER_SPEED_RATIO = 0.1;
    Game.TRANSFER_RATE = 0.05;
    Game.TARGET_LATENCY = 1000; // Max desync
    Game.RESTART_DELAY = 1000;



    //nowy state
    Game.prototype.computeState = function(delta) {
        var newState = {
            objects: {},
            timeStamp: this.state.timeStamp + delta
        };
        var newObjects = newState.objects;
        var objects = this.state.objects;
        // Generate a new state based on the old one
        for (var objId in objects) {
            var obj = objects[objId];
            if (!obj.dead) {
                newObjects[obj.id] = obj.computeState(delta);
            }
        }

        // Największy objekt
        var largest = null;
        var total = 0;

        // Sprawdź kolizje na nowym miejscu, napraw
        for (var i in newObjects) {
            var o = newObjects[i];
            for (var j in newObjects) {
                var p = newObjects[j];
                // sprawdź kolizje
                if (o !== p && o.intersects(p)) {
                    // naprawa
                    this.transferAreas_(o, p, delta);
                }
            }

            if (!this.inBounds_(o)) {
                // odbijanie od ścian
                this.repositionInBounds_(o);
            }


            // znajdź największy blob w grze
            if (!largest) {
                largest = o;
            }
            if (o.r > largest.r) {
                largest = o;
            }
            total += o.r;
        }
        // Victory conditions!
        if (largest.r > total / 2) {
            console.log('Koniec gry!');
            this.callback_('victory', {id: largest.id});
        }
        return newState;
    };

    Game.prototype.update = function(timeStamp) {
        var delta = timeStamp - this.state.timeStamp;
        if (delta < 0) {
            throw "Nie mogę policzyć gry dla przeszłości. Delta: " + delta;
        }
        if (delta > Game.MAX_DELTA) {
            throw "Nie mogę przeliczyć gry dla tak odległej przyszłości. Delta: " + delta;
        }
        this.state = this.computeState(delta);
        this.updateMeternumber++;
    };

    //update timer
    Game.prototype.updateEvery = function(interval, skew) {
        if (!skew) {
            skew = 0;
        }
        var lastUpdate = (new Date()).valueOf() - skew;
        var ctx = this;
        this.timer = setInterval(function() {
            var date = (new Date()).valueOf() - skew;
            if (date - lastUpdate >= interval) {
                ctx.update(date);
                lastUpdate += interval;
            }
        }, 1);
    };

    //koniec
    Game.prototype.over = function() {
        clearInterval(this.timer);
    };
// Dołączanie i wyjście
//
// gdy dołączy nowy gracz, ustalanie pozycji
    Game.prototype.join = function(id) {
        var x, y, vx, vy;
        switch (this.getPlayerMeternumber() % 4) {
            case 0:
                x = 0;
                y = 0;
                vx = 0.1;
                vy = 0.1;
                break;
            case 1:
                x = 640;
                y = 0;
                vx = -0.1;
                vy = 0.1;
                break;
            case 2:
                x = 0;
                y = 480;
                vx = 0.1;
                vy = -0.1;
                break;
            case 3:
                x = 640;
                y = 480;
                vx = -0.1;
                vy = -0.1;
                break;
        }
        // dodanie gracza
        var player = new Player({
            id: id,
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            r: 20
        });
        this.state.objects[player.id] = player;
        return player.id;
    };

// gdy player wyjdzie
    Game.prototype.leave = function(playerId) {
        delete this.state.objects[playerId];
    };
//gdy player strzela
    Game.prototype.shoot = function(id, direction, timeStamp) {
        console.log('Strzał wykonał', this.state.timeStamp - timeStamp, 'ago');
        var player = this.state.objects[id];
        // zlacz wektory
        var ex = Math.cos(direction);
        var ey = Math.sin(direction);
        // O ile przesuniecie
        var diff = player.area() * Game.SHOT_AREA_RATIO;
        // nowy blob wystrzalu
        var blob = new Blob({
            id: this.newId_(),
            vx: player.vx + ex * Game.SHOT_SPEED_RATIO,
            vy: player.vy + ey * Game.SHOT_SPEED_RATIO,
            r: 0
        });
        this.state.objects[blob.id] = blob;
        // NOWY BLOB nie nadpisuje ojca
        blob.x = player.x + (player.r + blob.r) * ex;
        blob.y = player.y + (player.r + blob.r) * ey;
        // predkosc ojca acc. wektor
        player.vx -= ex * Game.PLAYER_SPEED_RATIO;
        player.vy -= ey * Game.PLAYER_SPEED_RATIO;
        // Zmien wielkosc bloba ojca i strzalu
        blob.transferArea(diff);
        player.transferArea(-diff);
        // sprawdz, czy przezyl
        if (player.r <= 2) {
            player.dead = true;
            this.callback_('dead', {id: player.id, type: player.type});
        }
    };
// Zapis i odczyt stanu gry
//
// Zapis do JSON
    Game.prototype.save = function() {
        var serialized = {
            objects: {},
            timeStamp: this.state.timeStamp
        };
        for (var id in this.state.objects) {
            var obj = this.state.objects[id];
            // Zapis objektu do JSON
            serialized.objects[id] = obj.doJSON();
        }

        return serialized;
    };

// Ładowanie gry, JSON
    Game.prototype.load = function(savedState) {
        console.log(savedState.objects);
        var objects = savedState.objects;
        this.state = {
            objects: {},
            timeStamp: savedState.timeStamp.valueOf()
        }
        for (var id in objects) {
            var obj = objects[id];
            // W zależności od typu objektu (nieżywy i żywy)
            if (obj.type == 'blob') {
                this.state.objects[obj.id] = new Blob(obj);
            } else if (obj.type == 'player') {
                this.state.objects[obj.id] = new Player(obj);
            }
            // Przejdź po ID
            if (obj.id > this.lastId) {
                this.lastId = obj.id;
            }
        }
    };



    Game.prototype.getPlayerMeternumber = function() {
        var count = 0;
        var objects = this.state.objects;
        for (var id in objects) {
            if (objects[id].type == 'player') {
                count++;
            }
        }
        return count;
    };

    Game.prototype.blobExists = function(blobId) {
        return this.state.objects[blobId] !== undefined;
    };

    //zmiana xy
    Game.prototype.transferAreas_ = function(o, p, delta) {
        console.log('deadness', o.id, o.dead, p.id, p.dead);
        if (o.dead || p.dead) {
            return;
        }

        var big = o;
        var small = p;

        if (big.r < small.r) {
            big = p;
            small = o;
        }
        var overlap = big.overlap(small);

        console.log('overlapping', o.id, p.id, 'by', overlap);
        var diff = overlap * Game.TRANSFER_RATE;
        small.transferArea(-diff);
        big.transferArea(diff);

        // czy zabiliśmy przeciwnika
        if (small.r <= 1) {
            small.dead = true;
            this.callback_('dead', {id: small.id, type: small.type});
        }

    };
// model postaci/bloba
    var Blob = function(params) {
        if (!params) {
            return;
        }
        this.id = params.id;
        this.x = params.x;
        this.y = params.y;
        this.r = params.r;
        this.vx = params.vx;
        this.vy = params.vy;
        if (!this.type) {
            this.type = 'blob';
        }
    };

    // kolizje
    //
    Game.prototype.inBounds_ = function(o) {
        // kwadrat wokół bloba
        return o.r < o.x && o.x < (Game.WIDTH - o.r) &&
                o.r < o.y && o.y < (Game.HEIGHT - o.r);
    };

    Game.prototype.repositionInBounds_ = function(o) {
        var maxWidth = Game.WIDTH - o.r;
        var maxHeight = Game.HEIGHT - o.r;
        if (o.x < o.r) {
            o.x = o.r;
            o.vx = -o.vx;
        } else if (o.y < o.r) {
            o.y = o.r;
            o.vy = -o.vy;
        } else if (o.x > maxWidth) {
            o.x = maxWidth;
            o.vx = -o.vx;
        } else if (o.y > maxHeight) {
            o.y = maxHeight;
            o.vy = -o.vy;
        }
    };

    Game.prototype.callback_ = function(event, data) {
        var callback = this.callbacks[event];
        if (callback) {
            callback(data);
        } else {
            throw "OSTRZEŻENIE: brak zdefiniowanego callbacka";
        }
    };
// model gracza
    var Player = function(params) {
        this.name = params.name;
        this.type = 'player';

        Blob.call(this, params);
    };

    Game.prototype.newId_ = function() {
        return ++this.lastId;
    };

    //zwraca callbacki
    Game.prototype.on = function(event, callback) {
        this.callbacks[event] = callback;
    };


    // Blob kolizje
    Blob.prototype.overlap = function(blob) {
        var overlap = blob.r + this.r - this.distanceFrom(blob);
        return (overlap > 0 ? overlap : 0);
    };

    Blob.prototype.intersects = function(blob) {
        return this.distanceFrom(blob) < blob.r + this.r;
    };

    Blob.prototype.distanceFrom = function(blob) {
        return Math.sqrt(Math.pow(this.x - blob.x, 2) + Math.pow(this.y - blob.y, 2));
    };

    Blob.prototype.area = function() {
        return Math.PI * this.r * this.r;
    };

    Blob.prototype.transferArea = function(area) {
        var sign = 1;
        if (area < 0) {
            sign = -1;
        }
        this.r += sign * Math.sqrt(Math.abs(area) / Math.PI);
    };

    //ruch bloba
    Blob.prototype.computeState = function(delta) {
        // TODO: dampen vx and vy slightly?
        var newBlob = new this.constructor(this.doJSON());
        newBlob.x += this.vx * delta / 10;
        newBlob.y += this.vy * delta / 10;
        return newBlob;
    };

    Blob.prototype.doJSON = function() {
        var obj = {};
        for (var prop in this) {
            if (this.hasOwnProperty(prop)) {
                obj[prop] = this[prop];
            }
        }
        return obj;
    };

    Player.prototype = new Blob();
    Player.prototype.constructor = Player;

    exports.Game = Game;
    exports.Player = Player;
    exports.Blob = Blob;

})(typeof global === "undefined" ? window : exports);