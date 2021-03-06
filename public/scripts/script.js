const defaultText = `An alternative to the above is using Google’s diff-match-patch library\nto compute patches that represent the change between the source document and changed document,\nand we can easily translate these patches to changes in AutoMerge Text data structure.`
const defaultTitle = 'Untitled Document';
const defaultLang = 'text';
const languageSelectId = 'languageSelect';
const titleId = 'beamDocTitle';
const editorTextAreaId = 'beamDocEditor';
const collabListId = 'peer-list';
const chatListId = 'chat-container';
const alertSectionId = 'alert-section';
const chatMessage = 'chat-message';
const docId = window.location.pathname.split('/').slice(-1)[0];   // last elem of split by '/'
const alias = getUserAlias(docId);

let socket = io();
let doc;
let editor;
let firstConnectionFromTab = true;
let offline = false;
let offlineAlert = false;

function init() {

    doc = new BeamDoc(defaultTitle, defaultText, defaultLang);
    editor = new BeamEditor(
        doc,
        socket,
        document.getElementById(languageSelectId),
        document.getElementById(titleId),
        document.getElementById(editorTextAreaId),
        document.getElementById(collabListId),
        document.getElementById(chatListId),
        document.getElementById(chatMessage)
    );

    socket.on('crdt_changes', function(msg) {
        console.log('Crdt changes:');
        if (msg.docId !== docId) return;
        doc.applyChanges(msg.changes);
        editor.refresh();
    });

    // React to catch_up event
    socket.on('catch_up', (msg) => {
        console.log('Catch up:');
        doc.catchUp(msg);
        editor.refresh();
    });

    // Peer cursor
    socket.on('cursor_activity', (msg) => {
        editor.showPeerCursorActivity(msg);
    });

    // Emit event to join document, everytime connection is made
    socket.on('connect', () => {
        offline = false;
        socket.emit('join_document', {docId: docId, state: doc.getStateString(), alias: alias});
        if (offlineAlert) {
            offlineAlert = false;
            document.getElementById(alertSectionId).innerHTML = getConnectedAlert();
            setTimeout(() => {
                document.getElementById(alertSectionId).innerHTML = '';
            }, 2500);
        }
        else firstConnectionFromTab = false;
    });

    socket.on('disconnect', () => {
        offline = true;
        // Show offline alert after 5 seconds of disconnection
        setTimeout(() => {
            if (offline && !offlineAlert) {
                offlineAlert = true;
                document.getElementById(alertSectionId).innerHTML = getDisconnectedAlert();
            }
        }, 10000);
    });

    setLink();

    setFontSizeSelection();
    setThemeSelection();
    setFullscreenButton();

    removeLoader();

}

init();


// todo: use this to show chat fast-forward buttons
// let c = document.getElementById('chat-container');
// c.addEventListener('scroll', () => { if (c.scrollTop === 0) console.log('top'); if (c.scrollTop + c.clientHeight === c.scrollHeight) console.log('bottom') })

// todo: when new user joins, everyone emits their cursor positions
// todo: events reduce
// todo: duplicate alias check
// todo: optimize file imports

// let params = JSON.stringify({docId: docId, alias: alias});
// socket = io.connect('', {query: 'params=' + params});

// http://collabedit.com/a2k79
// todo: too many disconnections clutter chat in idle tabs
// todo: peer cursor lags when I type, it comes in the way
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



/*
- collab edit (CRDT + WebRTC)
- multiple types of lang supported
- multiple tabs supported
- Create new file (in another tab, enter filename ques1 -> it shows as ques1.cpp on tab name, changes to ques1.js if language changed to js)

- git-diff algo to broadcast compressed updates (reduce network packet size)


- collabedit uses long polling
- collabedit uses OT
- collabedit does not show other person's cursor positions / selections (like google docs does)
 */
