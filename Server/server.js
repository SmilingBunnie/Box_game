const http = require('http')
const express = require('express')
const { Server } = require('socket.io')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')

let clients = {}
let clientId = ''
let gameId = ''
let game = {}
let games = {}

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:3000',
    }
})

httpServer.listen(9090, () => {console.log('Listening on port 9090')})

io.sockets.on('connection', (socket) => {
    console.log('Connection opened')
    socket.on('disconnect', () => console.log('Connection closed'))
    socket.on('message', (message) => {
        const data = JSON.parse(message)

        if (data.method === 'create') {
            clientId = data.clientId
            gameId = uuidv4()
            game = {
                'id': gameId,
                'balls': 20,
                'clients': []
            }
            games[gameId] = game

            const payload = {
                'method': 'create',
                'game': game
            }
            if (!clients[clientId]) return
            clients[clientId].socket.emit('message', JSON.stringify(payload))

        }

        if (data.method === 'join') {
            gameId = data.gameId
            clientId = data.clientId
            game = games[gameId]
            if (game.clients.length > 2) return
            const color = {'0': 'red', '1': 'blue', '2': 'green'}[game.clients.length]
            game.clients.push({
                'clientId': clientId,
                'color': color
            })

            const payload = {
                'method': 'join',
                'color': color,
                'gameState': game
            }
            clients[clientId].socket.join(gameId)
            io.sockets.in(gameId).emit('message', JSON.stringify(payload))
            //if (game.clients.length === 3) update()
        }

        
        if (data.method === 'play'){
            gameId = data.gameId
            clientId = data.clientId
            const ballId = data.ballId
            const color = data.color

            let state = games[gameId].state
            if (!state) {
                state = {}
            }
            state[ballId] = color
            games[gameId].state = state
            game = games[gameId]

            const payload = {
                'method': 'update',
                'gameState': game
            }
            io.sockets.in(gameId).emit('message', JSON.stringify(payload))
          }
    })
    clientId = uuidv4()
    clients[clientId] = {'socket': socket }
    payload = {
        'method': 'connect',
        'clientId': clientId
    }
    socket.emit('message', JSON.stringify(payload))

})

const update = () => {
    for (const g of Object.keys(games)) {
        game = games[g]
        const payload = {
            'method': 'update',
            'gameState': game
        }
        game.clients.forEach(client => {
            clients[client.clientId].socket.emit('message', JSON.stringify(payload))
        })
        setInterval(() => {
            update()
        }, 1000);
    }
}