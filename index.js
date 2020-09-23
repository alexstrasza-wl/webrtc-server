const Koa = require('koa')
const WebSocket = require('ws')
const WsServer = require('./lib/ws')

const app = new Koa()
const server = new WsServer()

server.serve(new WebSocket.Server({server: app.listen('8082', '0.0.0.0')}))

