var io = require('socket.io').listen(5050);
var express = require('express');
var http = require('http');
var path = require('path');
var level = new require('./level.js');

var Game = gamejs.Game;
var game = new Game();
