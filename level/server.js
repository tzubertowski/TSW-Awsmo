/*jshint node: true */
var express = require('express');
var http = require('http');
var path = require('path');
var app = express();
var less = require('less-middleware');

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(less({
        src: __dirname + '/client',
        compress: true
    }));
    app.use(express.static(path.join(__dirname, 'client')));
});

var server = http.createServer(app).listen(app.get('port'), function () {
    console.log("Serwer nasłuchuje na porcie " + app.get('port'));
});

var io = require('socket.io');
var socket = io.listen(server);

socket.on('connection', function (client) {
    'use strict';
    var username;

    client.send('Wtaj!');
    client.send('Podaj nazwę użytkownika: ');

    client.on('message', function (msg) {
        if (!username) {
            username = msg;
            client.send('Witaj ' + username + '!');
            client.broadcast.emit('message', 'Nowy użytkownik: ' + username);
            return;
        }
        client.broadcast.emit('message', username + ': ' + msg);
    });
});

