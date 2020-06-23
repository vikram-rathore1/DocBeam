const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path');
const PORT = process.env.PORT || 5000;
const Automerge = require('automerge');

server.listen(PORT, () => console.log(`Listening on ${ PORT }`));

let docStore = new DocumentStore();
let socketMap = {};

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/new', (req, res) => {
      let id = randomId(6);
      while (docStore.docExists(id)) id = randomId(6);
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
        if (!socket.id in socketMap) return;
        let docId = socketMap[socket.id].docId;
        let alias = socketMap[socket.id].alias;
        let changes = docStore.leaveDoc(docId, alias);
        if (changes !== null && changes !== undefined)
            socket.broadcast.emit('crdt_changes', {docId: docId, changes: changes, alias: alias});
    });

    socket.on('crdt_changes', (msg) => {
        // console.log('IN: crdt_changes: ' + JSON.stringify(msg));

        docStore.applyChanges(msg.docId, msg.changes);
        socket.broadcast.emit('crdt_changes', msg);
        // console.log('OUT: crdt_changes: ' + JSON.stringify(msg));
    });

    socket.on('cursor_activity', (msg) => {
        // console.log('IN: cursor_activity: ' + JSON.stringify(msg));

        socket.broadcast.emit('cursor_activity', msg);
        // console.log('OUT: cursor_activity: ' + JSON.stringify(msg));
    });

    socket.on('join_document', (msg) => {
        // console.log('IN: join_document: ' + JSON.stringify(msg));

        if (docStore.docExists(msg.docId)) {
            docStore.joinDoc(msg.docId, msg.alias, msg.state);
            socketMap[socket.id] = {docId: msg.docId, alias: msg.alias};
            socket.emit('catch_up', docStore.getDocState(msg.docId));
            socket.join(msg.docId);
            // console.log('OUT: catch_up: ' + JSON.stringify(docStore.getDocState(msg.docId)));
        } else {
            socket.emit('not_found', 'Document does not exist');
        }
    });

});

function randomId(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function BeamDoc() {

    let state = Automerge.from({
        title: new Automerge.Text(''),
        text: new Automerge.Text('First text'),
        language: 'text',
        chats: [],
        collabs: {},
        creator: ''
    });

    this.getStateString = function() {
        return Automerge.save(state);
    };

    this.applyChanges = function(changes) {
        Automerge.applyChanges(state, changes);
    };

    this.join = function(collabName, collabState) {
        state = Automerge.merge(state, Automerge.load(collabState));
        if (state.creator === '') {
            state = Automerge.change(state, doc => {
                doc.creator = collabName;
                doc.chats.push({sender: collabName, message: 'Created the document', type: 'system'});
                doc.collabs[collabName] = {online: true, color: getRandomColor()};
            });
        } else {
            state = Automerge.change(state, doc => {
                doc.chats.push({sender: collabName, message: 'Joined the document', type: 'system'});
                if (collabName in doc.collabs) doc.collabs[collabName].online = true;
                else doc.collabs[collabName] = {online: true, color: getRandomColor()};
            });
        }
        // console.log(JSON.stringify(state));
    };

    this.leave = function(alias) {
        let newState = Automerge.change(state, doc => {
            if (alias in doc.collabs) {
                doc.collabs[alias].online = false;
                doc.chats.push({sender: alias, message: 'Left the document', type: 'system'});
            }
        });
        let changes = JSON.stringify(Automerge.getChanges(state, newState));
        state = newState;
        return changes;
    };

}

function DocumentStore() {

    let docs = {};

    this.addDoc = function (docId) {
        docs[docId] = new BeamDoc();
    };

    this.docExists = function(docId) {
        return (docs[docId] !== undefined);
    };

    this.getDocState = function(docId) {
        if (!this.docExists(docId)) return '';
        return docs[docId].getStateString();
    };

    this.applyChanges = function(docId, changes) {
        if (!this.docExists(docId)) return;
        docs[docId].applyChanges(changes);
    };

    this.joinDoc = function(docId, alias, state) {
        if (!this.docExists(docId)) return;
        docs[docId].join(alias, state);
    };

    this.leaveDoc = function(docId, alias) {
        if (!this.docExists(docId)) return null;
        return docs[docId].leave(alias);
    };

}

function getRandomColor() {
    return '#cccccc';
}

// let params = JSON.parse(socket.handshake.query.params);
// console.log(params.alias + ' joined on document ' + params.docId + ', socket: ' + socket.id);