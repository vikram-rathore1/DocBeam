const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Automerge = require('./dep/automerge');

app.use(express.static('public'));

let docs = {
    asda: {
        opened: false,
        state: undefined
    }
};

app.get('/doc/:documentId', (req, res) => {
    console.log('doc id: ' + req.params.documentId);
    if (req.params.documentId in docs)
        res.sendFile(__dirname + '/public/index.html');
    else res.send('Not found');
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('crdt_changes', (msg) => {
        // todo: get id within msg, or find the room this socket is joined in
        console.log('changes arrived, server state is: ');
        docs[msg.docId].state = Automerge.applyChanges(docs[msg.docId].state, msg.changes);
        console.log(docs[msg.docId].state.text.toString());
        console.log('Broadcasting ' + msg);
        socket.broadcast.emit('crdt_changes', msg);
    });

    socket.on('cursor_activity', (msg) => {
        socket.broadcast.emit('cursor_activity', msg);
    });

    socket.on('join_document', (msg) => {
        console.log('Someone wants to join document ' + msg.docId);
        if (msg.docId in docs) {
            if (docs[msg.docId].opened === false) {
                docs[msg.docId].opened = true;
                docs[msg.docId].state = Automerge.load(msg.state);
            } else {
                console.log('Not first person');
                socket.emit('catch_up', Automerge.save(docs[msg.docId].state));
            }
            socket.join(msg);
        } else {
            socket.emit('not_found', 'Document does not exist');
        }
    });

});

http.listen(3000, () => {
    console.log('listening on *:3000');
});