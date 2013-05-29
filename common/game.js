(function(exports) {
var Game = function() {
  this.state = {};
  this.oldState = {};

  // Ostatni id
  this.lastId = 0;
  this.callbacks = {};

  this.updateCount = 0;
  // Timer dla petli updatujacej
  this.timer = null;
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

// zapis modelu do JSON
Blob.prototype.toJSON = function() {
  var obj = {};
  for (var prop in this) {
    if (this.hasOwnProperty(prop)) {
      obj[prop] = this[prop];
    }
  }
  return obj;
};

// model gracza
var Player = function(params) {
  this.name = params.name;
  this.type = 'player';

  Blob.call(this, params);
};
})(typeof global === "undefined" ? window : exports);