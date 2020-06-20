const defaultText = `An alternative to the above is using Google’s diff-match-patch library\nto compute patches that represent the change between the source document and changed document,\nand we can easily translate these patches to changes in AutoMerge Text data structure.`
const defaultTitle = 'Untitled Document';
const defaultLang = 'text';

let doc = new BeamDoc(defaultTitle, defaultText, defaultLang);
let socket = io();

function init() {

    const docId = window.location.pathname.split('/').slice(-1)[0];   // last elem of split by '/'

    editor = CodeMirror.fromTextArea(document.getElementById("beamDocEditor"), {
        lineNumbers: true,
        mode: doc.getLanguage(),
        matchBrackets: true,
        showCursorWhenSelecting: true,
        cursorHeight: 0.85
    });

    editor.setValue(doc.getText());

    editor.on("change", function (ins, changeObj) {
        if (doc.getText() === ins.getValue()) return;   // Change event triggered by replication or no changes (paste same text over)
        doc.setText(ins.getValue(), function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch});
        });
    });

    // editor.on("cursorActivity", function (ins) {
    //     broadcastCursorActivity(ins.getCursor().line, ins.getCursor().ch, ins.getSelection());
    // });

    socket.on('crdt_changes', function(msg) {
        if (msg.docId !== docId) return;
        doc.applyChanges(msg.changes);
        // todo: make sync function that refreshes editor, title etc and preserves cursor position as well
        editor.setValue(doc.getText());
        console.log(msg);
    });

    // React to catch_up event
    socket.on('catch_up', function(msg) {
        doc.catchUp(msg);
        editor.setValue(doc.getText());
    });

    // Emit event to join document
    socket.emit('join_document', {docId: docId, state: doc.getStateString()});

    document.getElementById("beamDocTitle").value = doc.getTitle();

}

function changeTitle(titleInput) {
    doc.setTitle(titleInput.value, function(st, ch) {
        console.log(st.title.toString());
        console.log(JSON.stringify(ch));
    });
}

// function selectLanguage() {
//     editor.setOption("mode", document.getElementById("languageSelect").value);
// }

init();