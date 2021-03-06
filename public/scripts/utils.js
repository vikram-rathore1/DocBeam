let toastTimeout = undefined;

function getPatches(past, present) {
    let dmp = new diff_match_patch();
    let diff = dmp.diff_main(past, present);
    dmp.diff_cleanupSemantic(diff);
    return dmp.patch_make(past, diff);
}

function applyPatches(patches, insertFunc, deleteFunc) {
    patches.forEach(patch => {
        let index = patch.start1;
        patch.diffs.forEach(diff => {
            switch (diff[0]) {
                case 1:
                    insertFunc(index, diff[1]);
                case 0:
                    index += diff[1].length;
                    break;
                case -1:
                    deleteFunc(index, diff[1]);
                    break;
            }
        });
    });
}

// function getNewCursorPos(cursorIndex, past, present) {
//     let patches = getPatches(past, present);
//     let pos = {line: 0, ch: -1};
//     patches.forEach(patch => {
//         let index = patch.start1;
//         patch.diffs.forEach(diff => {
//             switch (diff[0]) {
//                 case 1:
//                     if (index < cursorIndex)
//                         cursorIndex += diff[1].length;
//                 case 0:
//                     index += diff[1].length;
//                     break;
//                 case -1:
//                     if (index < cursorIndex)
//                         cursorIndex -= Math.min(cursorIndex - index, diff[1].length);
//                     break;
//             }
//         });
//     });
//
//     for (let i = 0; i < cursorIndex && i < present.length; i++) {
//         if (present[i] === '\n') {
//             pos.line += 1;
//             pos.ch = 0;
//         } else pos.ch += 1;
//     }
//     return pos;
// }

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setCookie(cname, cvalue, exdays) {
    let d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    let expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getUserAlias(docId) {
    let alias = getCookie(docId);
    let p = new RegExp(/^[a-z0-9 ]+$/i);

    while (alias === undefined || alias === null || p.test(alias.trim()) === false) {
        alias = prompt('Enter your name (only letters, numbers and spaces)', '');
    }
    setCookie(docId, alias, 6);
    return alias;
}

function copyLink() {
    let textArea = document.createElement("textarea");
    textArea.value = window.location.href;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    toast('Link copied to clipboard');
}

function setLink() {
    document.getElementById('link-copy').innerHTML = '<i class="fa fa-copy"></i> ' + window.location.href;
    $('[data-toggle="tooltip"]').tooltip();
}

function setFontSizeSelection() {
    let sel = document.getElementById('fontSizeSelect');
    sel.addEventListener('change', () => {
        document.getElementById('editorContainer').style.fontSize = sel.value;
        editor.refresh();
    });
}

function setThemeSelection() {
    let sel = document.getElementById('themeSelect');
    sel.addEventListener('change', () => {
        editor.setTheme(sel.value);
    });
}

function removeLoader() {
    setTimeout(function(){
        document.getElementById('loader-wrapper').style.display = 'none';
    }, 300);
}

function getDisconnectedAlert() {
    return '<div class="alert alert-warning alert-dismissible" role="alert">\n' +
        '\n' +
        '                    <span class="fa-stack">\n' +
        '                      <i class="fas fa-wifi fa-stack-2x"></i>\n' +
        '                      <i class="fas fa-slash fa-stack-2x"></i>\n' +
        '                    </span>\n' +
        '\n' +
        '                    <strong>Disconnected from server, editing document in Offline mode</strong>\n' +
        '                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">\n' +
        '                        <span aria-hidden="true">&times;</span>\n' +
        '                    </button>\n' +
        '                </div>';
}

function getConnectedAlert() {
    return '<div class="alert alert-success alert-dismissible" role="alert">\n' +
    '\n' +
    '                    <span class="fa-stack">\n' +
    '                      <i class="fas fa-wifi fa-stack-2x"></i>\n' +
    '                    </span>\n' +
    '\n' +
    '                    <strong>Connected now!</strong>\n' +
    '                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">\n' +
    '                        <span aria-hidden="true">&times;</span>\n' +
    '                    </button>\n' +
    '                </div>';
}

function replaceTag(tag) {
    let tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    return tagsToReplace[tag] || tag;
}

function safe_tags_replace(str) {
    return str.replace(/[&<>]/g, replaceTag);
}

function urlify(text) {
    let urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '" target="_blank">' + url + '</a>';
    })
}

function toast(msg) {
    let x = document.getElementById('snackbar');
    x.className = 'show';
    x.innerHTML = msg;
    if (toastTimeout !== undefined) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function(){
            x.className = x.className.replace('show', '');
    }, 4500);
}

function setFullscreenButton() {
    document.getElementById('full-screen-button').addEventListener('click', () => {
        editor.fullScreen();
        toast('Press ESC to exit full screen mode')
    });
    document.addEventListener('keydown', function(e) {
        if(e.key === 'Escape'){
            if (editor.isFullScreen()) editor.fullScreen();
        }
    });
}