const Automerge = require('automerge');
const utils = require('./utils');
const startText = 'Welcome to DocBeam\n' +
    'As you know from the splendid intro,\n' +
    'This is a collaborative text editor (a mean and ugly one).\n' +
    '\n' +
    'This tool is under development\n' +
    'and is being developed by a team of best Software Engineers Ever.\n' +
    'The team works long hours, has lactose intolerance and consists of one person.\n' +
    '\n' +
    'That means DocBeam currently has an unknown number of bugs,\n' +
    'missing features and hacks lurking in the darkness\n' +
    'waiting for the right moment to attack\n' +
    '\n' +
    '\n' +
    'Okay then. You can remove this text now, I\'m done talking.';

function BeamDoc() {

    let state = Automerge.from({
        title: new Automerge.Text(''),
        text: new Automerge.Text(startText),
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
            message: (!isFirstCollab) ? 'joined the document' : 'created the document',
            type: 'system'
        };
        console.log('Joining socket to doc. isFirstCollab, wasAlreadyRegistered, wasAlreadyOnline are:');
        console.log(isFirstCollab);
        console.log(wasAlreadyRegistered);
        console.log(wasAlreadyOnline);

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
        console.log('Collabs after joining this one are: ');
        console.log(JSON.stringify(doc.collabs), undefined, 2);
        let changes = Automerge.getChanges(state, newState);
        state = newState;
        return changes;
    };

    this.leave = (socketId) => {
        console.log('Removing socket ' + socketId + ' from online sockets');
        let newState = Automerge.change(state, doc => {
            for (collab in doc.collabs) {
                if (socketId in doc.collabs[collab].sockets) {
                    delete doc.collabs[collab].sockets[socketId];
                    console.log('Socket belongs to ' + collab + ', collabs map of doc after deleting this socket is: ');
                    console.log(JSON.stringify(doc.collabs), undefined, 2);
                    if (Object.keys(doc.collabs[collab].sockets).length === 0) {
                        doc.chats.push({ sender: collab, message: 'left the document', type: 'system' });
                        doc.collabs[collab].online = false;
                        console.log('Setting collaborator as offline & Pushing a chat for leaving the doc');
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

    this.getDocs = () => docs;

}

module.exports = () => new DocumentStore();