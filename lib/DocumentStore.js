const Automerge = require('automerge');
const utils = require('./utils');

function BeamDoc() {

    let state = Automerge.from({
        title: new Automerge.Text(''),
        text: new Automerge.Text('First text'),
        language: 'text',
        chats: [],
        collabs: {},
        creator: ''
    });

    this.getStateString = () => {
        return Automerge.save(state);
    };

    this.applyChanges = (changes) => {
        Automerge.applyChanges(state, changes);
    };

    this.join = (collabName, collabState) => {
        state = Automerge.merge(state, Automerge.load(collabState));
        if (state.creator === '') {
            state = Automerge.change(state, doc => {
                doc.creator = collabName;
                doc.chats.push({sender: collabName, message: 'Created the document', type: 'system'});
                doc.collabs[collabName] = {online: true, color: utils.getRandomColor()};
            });
        } else {
            state = Automerge.change(state, doc => {
                doc.chats.push({sender: collabName, message: 'Joined the document', type: 'system'});
                if (collabName in doc.collabs) doc.collabs[collabName].online = true;
                else doc.collabs[collabName] = {online: true, color: utils.getRandomColor()};
            });
        }
        // console.log(JSON.stringify(state));
    };

    this.leave = (alias) => {
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

    this.joinDoc = (docId, alias, state) => {
        if (!this.docExists(docId)) return;
        docs[docId].join(alias, state);
    };

    this.leaveDoc = (docId, alias) => {
        if (!this.docExists(docId)) return null;
        return docs[docId].leave(alias);
    };

}

module.exports = () => new DocumentStore();