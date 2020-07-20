/** @type {SocketIO.Server} */
let _io;
const MAX_CLIENTS = 15;

/** @param {SocketIO.Socket} socket */
function listen(socket) {
  const io = _io;
  const rooms = io.nsps['/'].adapter.rooms;
  console.log('rooms', rooms)
  socket.on('join', function(room) {
    let numClients = 0;
    if (rooms[room]) {
      numClients = rooms[room].length;
      console.log('numclients', numClients)
    }
    if (numClients < MAX_CLIENTS) {
      socket.on('ready', function() {
        console.log('in ready event');
        socket.broadcast.to(room).emit('ready', socket.id);
      });
      socket.on('offer', function (id, message) {
        console.log('in offer event', id);
        socket.to(id).emit('offer', socket.id, message);
      });
      socket.on('answer', function (id, message) {
        console.log('in answer event', id);
        socket.to(id).emit('answer', socket.id, message);
      });
      socket.on('candidate', function (id, message) {
        console.log('in candidate event', id);
        socket.to(id).emit('candidate', socket.id, message);
      });
      socket.on('chatType', function (data) {
        socket.broadcast.to(room).emit('chatType', data);
      })
      socket.on('disconnect', function() {
        console.log('disconnect socket');
        socket.broadcast.to(room).emit('bye', socket.id);
      });
      socket.join(room);
    } else {
      socket.emit('full', room);
    }
  });
}

/** @param {SocketIO.Server} io */
module.exports = function(io) {
  _io = io;
  return {listen};
};