const defaultText = `An alternative to the above is using Google’s diff-match-patch library\nto compute patches that represent the change between the source document and changed document,\nand we can easily translate these patches to changes in AutoMerge Text data structure.`
const defaultTitle = 'Untitled Document';
const defaultLang = 'text';
const languageSelectId = 'languageSelect';
const titleId = 'beamDocTitle';
const editorTextAreaId = 'beamDocEditor';
const docId = window.location.pathname.split('/').slice(-1)[0];   // last elem of split by '/'

let socket = io();
let doc = new BeamDoc(defaultTitle, defaultText, defaultLang);
let editor = new BeamEditor(doc, socket, document.getElementById(languageSelectId), document.getElementById(titleId), document.getElementById(editorTextAreaId));
editor.refresh();

function init() {

    socket.on('crdt_changes', function(msg) {
        if (msg.docId !== docId) return;
        doc.applyChanges(msg.changes);
        editor.refresh();
    });

    // React to catch_up event
    socket.on('catch_up', function(msg) {
        doc.catchUp(msg);
        editor.refresh();
    });

    // Peer cursor
    socket.on('cursor_activity', function(msg) {
        editor.showPeerCursor(msg);
    });

    // Emit event to join document
    socket.emit('join_document', {docId: docId, state: doc.getStateString()});

}

init();


// http://collabedit.com/a2k79
// todo: auth (browser cache)
// todo: missed events catchup, offline editing (lossless, sync & merge whenever online)
// todo: redis, persist doc
// todo: UI, editor size/scroll
// todo: intelligent cursor preservation
// todo: validate title length etc
// todo: deploy + test
// todo: broadcast cursor/selection
// todo: online status, show collaborators online/offline, xyz connected, abc disconnected
// todo: chat, history (xyz made changes <show> )
