const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path');
const PORT = process.env.PORT || 5000;
const docStore = require('./lib/DocumentStore')();
const utils = require('./lib/utils');

server.listen(PORT, () => console.log(`Listening on ${ PORT }`));

let socketMap = {};     // socket id -> document id

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/new', (req, res) => {
      let id = utils.randomId(6);
      while (docStore.docExists(id)) id = utils.randomId(6);
      docStore.addDoc(id);
      res.writeHead(302, {
          'Location': '/' + id
      });
      res.send();
  })
  .get('/:documentId', (req, res) => {
      if (docStore.docExists(req.params.documentId))
          res.render('pages/editor');
      else res.send('Not found');
  });

io.on('connection', (socket) => {

    socket.on('disconnect', () => {
        let docId = socketMap[socket.id];
        if (docId === undefined) return;

        let changes = docStore.leaveDoc(docId, socket.id);
        socket.broadcast.to(docId).emit('crdt_changes', {docId: docId, changes: changes});
        console.log(socket.id + ' disconnected from doc ' + docId);
        docStore.logDocument(docId);
    });

    socket.on('crdt_changes', (msg) => {
        let docId = socketMap[socket.id];
        if (docId === undefined) return;

        console.log('IN: crdt_changes: ' + JSON.stringify(msg, null, 4));

        docStore.applyChanges(msg.docId, msg.changes);
        console.log('Server State: ');
        docStore.logDocument(msg.docId);
        socket.broadcast.to(docId).emit('crdt_changes', msg);
        console.log('OUT: crdt_changes: ' + JSON.stringify(msg, null, 4));
    });

    socket.on('cursor_activity', (msg) => {
        console.log('IN: cursor_activity: ' + JSON.stringify(msg));
        let docId = socketMap[socket.id];
        if (docId === undefined) return;
        socket.broadcast.to(docId).emit('cursor_activity', msg);
        console.log('OUT: cursor_activity: ' + JSON.stringify(msg));
    });

    socket.on('join_document', (msg) => {
        console.log('IN: join_document: ' + JSON.stringify({docId: msg.docId, alias: msg.alias, socketId: socket.id}));

        if (docStore.docExists(msg.docId)) {
            let changes = docStore.joinDoc(msg.docId, socket.id, msg.alias, msg.state);
            socketMap[socket.id] = msg.docId;
            socket.emit('catch_up', docStore.getDocState(msg.docId));
            socket.join(msg.docId);
            socket.broadcast.to(msg.docId).emit('crdt_changes', {docId: msg.docId, changes: changes});
            console.log('OUT: catch_up: ');
            docStore.logDocument(msg.docId);
        } else {
            socket.emit('not_found', 'Document does not exist');
        }
    });

});

// let params = JSON.parse(socket.handshake.query.params);
// console.log(params.alias + ' joined on document ' + params.docId + ', socket: ' + socket.id);