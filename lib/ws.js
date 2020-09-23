const { v4: uuidv4 } = require('uuid');
const msg_handlers = {
  'call-to': function(ws, msg) {
    let from = ws.id
    let { to } = msg
    this._send(to, { event: 'call-in', from })
  },
  'call-cancel': function (ws, msg) {
    let from = ws.id
    let { to } = msg
    this._send(to, { event: 'call-cancel', from })
  },
  'call-reply': function (ws, msg) {
    let from = ws.id
    let { to, status } = msg
    this._send(to, { event: 'call-reply', from, status })
  },
  'description-send': function (ws, msg) {
    let from = ws.id
    let { to, description } = msg
    this._send(to, {event: 'description-in', from, description})
  },
  'answer-send': function (ws, msg) {
    let from = ws.id
    let { to, answer } = msg
    this._send(to, { event: 'answer-in', from, answer })
  },
  'candidate-send': function (ws, msg) {
    let from = ws.id
    let { to, candidate } = msg
    this._send(to, { event: 'candidate-in', from, candidate })
  }
}

class WsServer {
  constructor () {
    this.wss = null
    this.clients = null
    this.scaner = null
    this.TIMEOUT = 2000
    this.handlers = msg_handlers
  }
  serve (wss) {
    this.wss = wss
    this.clients = wss.clients

    wss.on('connection', ws => {
      this._onConnection(ws)
      ws.send(JSON.stringify({event: 'user-id', uid: ws.id}))
      ws.send(JSON.stringify({event: 'user-list', users: this._getUserList(ws.id)}))
      this._notice(ws.id, {event: 'user-come', uid: ws.id})
    })
    wss.on('close', () => {
      clearInterval(this.scaner)
    })

    this._scanerStart()
  }
  _scanerStart () {
    this.scaner = setInterval(() => {
      if (this.clients.size > 0) {
        this.clients.forEach(ws => {
          if (!ws.isAlive) {
            ws.terminate()
          } else {
            ws.isAlive = false
            ws.ping()
          }
        })
      }
    }, this.TIMEOUT)
  }
  _send (id, msg) {
    this.clients.forEach(ws => {
      if (ws.id === id) {
        ws.send(JSON.stringify(msg))
      }
    })
  }
  _notice (id, msg) {
    this.clients.forEach(ws => {
      if (ws.id !== id) {
        ws.send(JSON.stringify(msg))
      }
    })
  }
  _onConnection (ws) {
    ws.isAlive = true
    ws.id = uuidv4()
    ws.on('message', msg => {
      let data = JSON.parse(msg)
      if (typeof this.handlers[data.event] === 'function') {
        this.handlers[data.event].call(this, ws, data)
      }
    })
    ws.on('pong', () => {
      ws.isAlive = true
    })
    ws.on('close', () => {
      this._notice(ws.id, { event: 'user-leave', uid: ws.id })
    })
  }
  _getUserList (id) {
    let users = []
    this.clients.forEach(ws => {
      if (ws.id !== id) {
        users.push(ws.id)
      }
    })
    return users
  }
}

module.exports = WsServer