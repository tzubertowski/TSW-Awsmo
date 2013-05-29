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



// Dołączanie i wyjście
//
// gdy dołączy nowy gracz, ustalanie pozycji
Game.prototype.join = function(id) {
  var x, y, vx, vy;
  switch (this.getPlayerMeternumber() % 4) {
    case 0:
      x = 0; y = 0; vx = 0.1; vy = 0.1;
      break;
    case 1:
      x = 640; y = 0; vx = -0.1; vy = 0.1;
      break;
    case 2:
      x = 0; y = 480; vx = 0.1; vy = -0.1;
      break;
    case 3:
      x = 640; y = 480; vx = -0.1; vy = -0.1;
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

// zapis modelu do JSON
/*Blob.prototype.doJSON = function() {
  var obj = {};
  for (var prop in this) {
    if (this.hasOwnProperty(prop)) {
      obj[prop] = this[prop];
    }
  }
  return obj;
};
*/

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


// model gracza
var Player = function(params) {
  this.name = params.name;
  this.type = 'player';

  Blob.call(this, params);
};

Player.prototype = new Blob();
Player.prototype.constructor = Player;

exports.Game = Game;
exports.Player = Player;
exports.Blob = Blob;

})(typeof global === "undefined" ? window : exports);