const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
const port = process.env.PORt || 3000

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const publicDirPath = path.join(__dirname, '../public')
app.use(express.static(publicDirPath))

io.on('connection', (socket) => {
    console.log('New web socket connection')

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({id: socket.id, ...options})
        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        
        callback()
    })

    socket.on('sendMessage', (msg, callback) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if(filter.isProfane(msg)){
            return callback('Profamity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback()
    })

    socket.on('sendLocation', (position, callback) => {
        const user = getUser(socket.id)
        const url = `https://google.com/maps?q=${position.latitude},${position.longitude}`
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,url))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage('Admin',`User ${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Servidor funcionando en el puerto ${port}`)
})