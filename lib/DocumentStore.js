const Automerge = require('automerge');
const utils = require('./utils');

function BeamDoc() {

    let state = Automerge.from({
        title: new Automerge.Text(''),
        text: new Automerge.Text('First text'),
        language: 'text',
        chats: [],
        collabs: {},        // { vikram: {sockets: { socketId, socketId }} }
        creator: ''
    });

    this.getStateString = () => {
        return Automerge.save(state);
    };

    this.applyChanges = (changes) => {
        state = Automerge.applyChanges(state, changes);
    };

    this.join = (socketId, collabName, collabState) => {
        let isFirstCollab = (state.creator === '');
        let wasAlreadyRegistered = (collabName in state.collabs);
        let wasAlreadyOnline = (wasAlreadyRegistered && Object.keys(state.collabs[collabName].sockets).length > 0);
        let chatMsg = {
            sender: collabName,
            message: (!isFirstCollab) ? 'Joined the document' : 'Created the document',
            type: 'system'
        };

        let mergeState = Automerge.merge(state, Automerge.load(collabState));
        let newState = Automerge.change(mergeState, doc => {
            if (isFirstCollab) doc.creator = collabName;
            if (!wasAlreadyOnline) doc.chats.push(chatMsg);
            if (!wasAlreadyRegistered) {
                let usedColors = {};
                for (c in doc.collabs) usedColors[doc.collabs[c].color] = true;
                doc.collabs[collabName] = {color: utils.getRandomColorExcept(Object.keys(usedColors)), sockets: {}};
            }
            doc.collabs[collabName].sockets[socketId] = true;
            doc.collabs[collabName].online = true;
        });
        let changes = Automerge.getChanges(state, newState);
        state = newState;
        return changes;
    };

    this.leave = (socketId) => {
        let newState = Automerge.change(state, doc => {
            for (collab in doc.collabs) {
                if (socketId in doc.collabs[collab].sockets) {
                    delete doc.collabs[collab].sockets[socketId];
                    if (doc.collabs[collab].sockets.length === 0) {
                        doc.chats.push({ sender: collab, message: 'Left the document', type: 'system' });
                        doc.collabs[collab].online = false;
                    }
                }
            }
        });
        let changes = Automerge.getChanges(state, newState);
        state = newState;
        return changes;
    };

    this.getLog = () => {
        return {
            text: state.text.toString(),
            language: state.language,
            chats: state.chats,
            collabs: state.collabs,
            creator: state.creator
        };
    };

}

function DocumentStore() {

    let docs = {};

    this.addDoc = function (docId) {
        docs[docId] = new BeamDoc();
    };

    this.docExists = (docId) => {
        return (docs[docId] !== undefined);
    };

    this.getDocState = (docId) => {
        if (!this.docExists(docId)) return '';
        return docs[docId].getStateString();
    };

    this.applyChanges = (docId, changes) => {
        if (!this.docExists(docId)) return;
        docs[docId].applyChanges(changes);
    };

    this.joinDoc = (docId, socketId, alias, state) => {
        if (!this.docExists(docId)) return null;
        return docs[docId].join(socketId, alias, state);
    };

    this.leaveDoc = (docId, socketId) => {
        if (!this.docExists(docId)) return null;
        return docs[docId].leave(socketId);
    };

    this.logDocument = (docId) => {
        if (!this.docExists(docId)) return;
        console.log(JSON.stringify(docs[docId].getLog(), null, 4));
    };

}

module.exports = () => new DocumentStore();