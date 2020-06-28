function BeamEditor(doc, socket, languageSelect, title, textArea, collabList, chatList, chatMessageInput) {

    const blinkRate = 500;

    let _this = this;       // todo: remove this hack, this is done to access "this" inside languageSelect.addEventListener

    const themes = {
        'default': {
            'peerSelectionClass': 'peer-selection-text-light'
        },
        '3024-day': {
            'peerSelectionClass': 'peer-selection-text-light'
        },
        'cobalt': {
            'peerSelectionClass': 'peer-selection-text-dark'
        }
    };

    let editor = CodeMirror.fromTextArea(textArea, {
        lineNumbers: true,
        mode: doc.getLanguage(),
        matchBrackets: true,
        showCursorWhenSelecting: true,
        cursorHeight: 1,
        styleSelectedText: true,
        styleActiveLine: {nonEmpty: true},
        cursorBlinkRate: blinkRate,
        viewportMargin: Infinity
    });

    let ignoreCursorActivity = false;

    let ignoreChangeEvent = false;

    let peerCursors = {};       // alias -> { marker: <> , interval: <>, selection: <>}

    editor.on("change", function (ins, changeObj) {
        if (ignoreChangeEvent || doc.getText() === ins.getValue()) {
            ignoreChangeEvent = false;
            return;
        }
        doc.setText(ins.getValue(), function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch, alias: alias});
        });
    });

    editor.on("cursorActivity", function (ins) {
        console.log('---------- Dom: Cursor activity fired');
        console.log('ignore: ' + ignoreCursorActivity);
        if (ignoreCursorActivity) {
            ignoreCursorActivity = false;
            return;
        }
        socket.emit('cursor_activity', {
            cursorRow: ins.getCursor().line,
            cursorCol: ins.getCursor().ch,
            selection: [ins.getCursor(true), ins.getCursor(false)],
            alias: alias
        });
    });

    // title.addEventListener('change', function() {
    //     doc.setTitle(title.value, function(st, ch) {
    //         socket.emit('crdt_changes', {docId: docId, changes: ch, alias: alias});
    //     });
    // });

    languageSelect.addEventListener('change', function() {
        editor.setOption('mode', languageSelect.value);
        doc.setLanguage(languageSelect.value, languageSelect.options[languageSelect.selectedIndex].innerHTML, function(st, ch) {
            socket.emit('crdt_changes', {docId: docId, changes: ch, alias: alias});
        });
        _this.refresh();
    });

    chatMessageInput.addEventListener('keypress', function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            // todo: validation length etc
            let msg = chatMessageInput.value;
            doc.pushChat(msg, function(st, ch) {
                socket.emit('crdt_changes', {docId: docId, changes: ch, alias: alias});
            });
            chatMessageInput.value = '';
            _this.refresh();
        }
    });

    this.refresh = function() {
        // ignoreCursorActivity = true;        // Don't emit next cursor activity to network
        // sync title
        // title.value = doc.getTitle();

        // sync language

        // let opts = languageSelect.options;
        // for (let i = 0; i < opts.length; i++) {
        //     console.log(opts[i]);
        //     if (opts[i].value === doc.getLanguage()) {
        //         languageSelect.selectedIndex = i;
        //         console.log('selected index is ' + i);
        //         break;
        //     }
        // }
        $(languageSelect).selectpicker('val', doc.getLanguage());

        // get scroll position, to preserve
        let scrollInfo = editor.getScrollInfo();

        // sync text, cursor, selection, language
        const patches = getPatches(editor.getValue(), doc.getText());
        applyPatches(patches, (index, txt) => {
            let start = this.getLineChFromIndex(index);
            ignoreChangeEvent = true;
            editor.replaceRange(txt, start, start);
        }, (index, txt) => {
            let start = this.getLineChFromIndex(index);
            let end = this.getLineChFromIndex(index + txt.length);
            ignoreChangeEvent = true;
            editor.replaceRange('', start, end);
        });

        editor.setOption('mode', languageSelect.value);
        editor.scrollTo(scrollInfo.left, scrollInfo.top);

        // sync collab list
        let collabListHtml = '';
        let cList= doc.getCollaboratorList();
        if (cList) {
            for (c in cList) {
                let color = cList[c].color;
                let opacity = (cList[c].online) ? '1' : '0.5';
                collabListHtml += '<span class="label peer-label" style="background: ' + color + '; opacity: ' + opacity + '">' + c + '</span> ';
            }
        }
        collabList.innerHTML = collabListHtml;

        // sync chats
        let chats = doc.getChatList();
        let chatHtml = '';
        for (i in chats) {
            let c = chats[i];
            let color = doc.getCollaboratorColor(c.sender);
            let cls = (c.type === 'system') ? 'ui-text' : 'chat-message';

            chatHtml += '<div class="chat-message-wrapper">\n' +
                '                    <span class="' + cls + '">\n' +
                '                        <b style="color: ' + color + ';">' + c.sender + '</b> ' + c.message +
                '                    </span>\n' +
                '                </div>';
        }
        chatList.innerHTML = chatHtml;
        chatList.scrollTo(0,chatList.scrollHeight);

    };

    // Find out index of position where cursor is, assuming text is 1-d string
    // this.getCursorIndex = function(pos) {
    //     let past = editor.getValue();
    //     let present = doc.getText();
    //     let cursorIndex = pos.ch;
    //     let line = 0;
    //     while (line < pos.line) {
    //         cursorIndex += editor.lineInfo(line).text.length + 1;
    //         line += 1;
    //     }
    //     let cpos = getNewCursorPos(cursorIndex, past, present);
    //     cpos.sticky = pos.sticky;
    //     return cpos;
    // };

    this.getLineChFromIndex = function(index) {
        let lineNumber = 0;
        let line = editor.getLine(lineNumber);
        while (line !== undefined && line.length < index) {
            index -= (line.length + 1);
            lineNumber++;
            line = editor.getLine(lineNumber);
        }
        return {line: lineNumber, ch: index};
    };

    this.showPeerCursorActivity = function(cursorInfo) {
        console.log('--------- PEER CURSOR: ');
        console.log(cursorInfo);
        if (cursorInfo.alias === alias) return;     // Do nothing if this is my own cursor from another tab

        // Clear old cursor & selection
        if (cursorInfo.alias in peerCursors) {
            peerCursors[cursorInfo.alias].marker.clear();
            peerCursors[cursorInfo.alias].selectionMarker.clear();
            clearInterval(peerCursors[cursorInfo.alias].interval);
        } else peerCursors[cursorInfo.alias] = {marker: undefined, selectionMarker: undefined, interval: undefined};

        // Create cursor element
        const peerCursorPos = {line: cursorInfo.cursorRow, ch: cursorInfo.cursorCol};
        const peerCursorCoords = editor.cursorCoords(peerCursorPos);
        const cursorElement = document.createElement('span');
        cursorElement.className = 'peer-cursor';
        cursorElement.setAttribute('peer', cursorInfo.alias);
        cursorElement.style.borderLeftColor = doc.getCollaboratorColor(cursorInfo.alias);
        cursorElement.style.borderBottomColor = doc.getCollaboratorColor(cursorInfo.alias);
        cursorElement.style.height = `${(peerCursorCoords.bottom - peerCursorCoords.top)}px`;
        peerCursors[cursorInfo.alias].marker = editor.setBookmark(peerCursorPos, { widget: cursorElement });

        // Register cursor blinking behavior
        let show = true;
        peerCursors[cursorInfo.alias].markerInterval = setInterval(() => {
            if(show) {
                cursorElement.style.visibility = 'hidden';
                show = false;
            } else {
                cursorElement.style.visibility = 'visible';
                show = true;
            }
        }, blinkRate);

        // Register hover behavior on cursor
        // todo: Add hover tooltip (complete the block below)
        cursorElement.addEventListener('mouseover', function () {
            console.log(cursorElement.attributes.peer);
        });

        // Show peer's text selection
        let peerSelectionClass = themes[editor.getOption('theme')].peerSelectionClass;
        peerCursors[cursorInfo.alias].selectionMarker = editor.markText(cursorInfo.selection[0], cursorInfo.selection[1], {className: peerSelectionClass});
    };

    this.setTheme = function(theme) {
        if (theme in themes) {
            let currentPeerSelectionClass = themes[editor.getOption('theme')].peerSelectionClass;
            let nextPeerSelectionClass = themes[theme].peerSelectionClass;
            let selections = document.getElementsByClassName(currentPeerSelectionClass);

            editor.setOption('theme', theme);

            // console.log('currentPeerSelectionClass: ' + currentPeerSelectionClass);
            // console.log('nextPeerSelectionClass: ' + nextPeerSelectionClass);
            // console.log('selections: ');
            // console.log(selections);

            // for (let i = 0; i < selections.length; i++) {
            //     console.log('removing class ' + currentPeerSelectionClass + ' from ');
            //     console.log(selections[i]);
            //     selections[i].classList.remove(currentPeerSelectionClass);
            //     selections[i].classList.add(nextPeerSelectionClass);
            //     console.log('adding class ' + nextPeerSelectionClass + ' to ');
            //     console.log(selections[i]);
            // }
        }
    };

    this.getEditorInstance = function() {
        return editor;
    };

}
