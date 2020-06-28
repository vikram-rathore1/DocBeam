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
  .get('/docStore', (req, res) => {
      let d = docStore.getDocs();
      let msg = '';
      for (docId in d) {
          msg += '<h2>' + docId + '</h2>';
          msg += '<pre>' + JSON.stringify(d[docId].getLog(), undefined, 2) + '</pre><br/>';
      }
      res.send(msg);
  })
  .get('/:documentId', (req, res) => {
      if (docStore.docExists(req.params.documentId))
          res.render('pages/editor');
      else res.send('Not found');
  });

io.on('connection', (socket) => {

    socket.on('disconnect', () => {
        let docId = socketMap[socket.id];
        delete socketMap[socket.id];
        if (docId === undefined) return;

        console.log(socket.id + ' disconnected. It was connected to doc ' + docId + '. It is deleted from socketMap');
        setTimeout(() => {
            console.log('----------------');
            console.log('Timeout: Checking if ' + socket.id + ' is still disconnected');
            if (!(socket.id in socketMap)) {
                console.log('Yes, still disconnected');
                let changes = docStore.leaveDoc(docId, socket.id);
                console.log('Broadcast crdt_changes after ' + socket.id + ' left ' + docId);
                socket.broadcast.to(docId).emit('crdt_changes', {docId: docId, changes: changes});
            }
            console.log('----------------');
        }, 10000);
    });

    socket.on('crdt_changes', (msg) => {
        let docId = socketMap[socket.id];
        if (docId === undefined) return;

        docStore.applyChanges(msg.docId, msg.changes);
        socket.broadcast.to(docId).emit('crdt_changes', msg);
    });

    socket.on('cursor_activity', (msg) => {
        let docId = socketMap[socket.id];
        if (docId === undefined) return;
        socket.broadcast.to(docId).emit('cursor_activity', msg);
    });

    socket.on('join_document', (msg) => {
        console.log('----------------');
        console.log('IN: join_document: ' + JSON.stringify({docId: msg.docId, alias: msg.alias, socketId: socket.id}));

        if (docStore.docExists(msg.docId)) {
            socketMap[socket.id] = msg.docId;
            console.log('setting ' + socket.id + ' in socketMap');

            let changes = docStore.joinDoc(msg.docId, socket.id, msg.alias, msg.state);
            console.log('Broadcast crdt_changes after ' + socket.id + ' joined ' + msg.docId);
            socket.broadcast.to(msg.docId).emit('crdt_changes', {docId: msg.docId, changes: changes});

            socket.emit('catch_up', docStore.getDocState(msg.docId));
            socket.join(msg.docId);
            console.log('OUT: catch_up');
        } else {
            console.log('Doc not found');
            socket.emit('not_found', 'Document does not exist');
        }
        console.log('----------------');
    });

});

// let params = JSON.parse(socket.handshake.query.params);
// console.log(params.alias + ' joined on document ' + params.docId + ', socket: ' + socket.id);