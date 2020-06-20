function BeamEditor(doc, socket, languageSelect, title, textArea) {

    let editor = CodeMirror.fromTextArea(textArea, {
        lineNumbers: true,
        mode: doc.getLanguage(),
        matchBrackets: true,
        showCursorWhenSelecting: true,
        cursorHeight: 1,
        styleSelectedText: true
    });

    editor.on("change", function (ins, changeObj) {
        if (doc.getText() === ins.getValue()) return;   // Change event triggered by replication or no changes (paste same text over)
        doc.setText(ins.getValue(), function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch});
        });
    });

    editor.on("cursorActivity", function (ins) {
        // console.log(ins.getCursor().line, ins.getCursor().ch, ins.getSelection());
    });

    title.addEventListener('change', function() {
        doc.setTitle(title.value, function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch});
        });
    });

    languageSelect.addEventListener('change', function() {
        editor.setOption('mode', languageSelect.value);
        doc.setLanguage(languageSelect.value, function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch});
        });
    });

    this.refresh = function() {
        // sync title
        title.value = doc.getTitle();

        // sync language
        let opts = languageSelect.options;
        for (let i = 0; i < opts.length; i++) {
            if (opts[i].value === doc.getLanguage()) {
                languageSelect.selectedIndex = i;
                break;
            }
        }

        // sync text
        let cursorPos = getNewCursorPos(this.getCursorIndex(), editor.getValue(), doc.getText());
        editor.setValue(doc.getText());
        editor.setOption('mode', languageSelect.value);
        editor.setCursor(cursorPos);



        // Experimental code below
        // editor.markText({line: 0, ch: 1}, {line: 1, ch: 4}, {className: "styled-background"});
        //
        // const peerCursorPos = {line: 1, ch: 4};
        // const peerCursorCoords = editor.cursorCoords(peerCursorPos);
        // const cursorElement = document.createElement('span');
        // cursorElement.style.borderLeftStyle = 'solid';
        // cursorElement.style.borderLeftWidth = '2px';
        // cursorElement.style.borderLeftColor = '#ff0000';
        // cursorElement.style.height = `${(peerCursorCoords.bottom - peerCursorCoords.top)}px`;
        // cursorElement.style.padding = 0;
        // cursorElement.style.zIndex = 0;
        // let marker = editor.setBookmark(peerCursorPos, { widget: cursorElement });
        // marker.clear();
    };

    // Find out index of position where cursor is, assuming text is 1-d string
    this.getCursorIndex = function() {
        let cursorPos = editor.getCursor();
        let cursorIndex = cursorPos.ch;
        let line = 0;
        while (line < cursorPos.line) {
            cursorIndex += editor.lineInfo(line).text.length + 1;
            line += 1;
        }
        return cursorIndex;
    };

    this.getEditorInstance = function() {
        return editor;
    }

}