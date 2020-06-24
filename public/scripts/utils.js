function getPatches(past, present) {
    let dmp = new diff_match_patch();
    let diff = dmp.diff_main(past, present);
    dmp.diff_cleanupSemantic(diff);
    return dmp.patch_make(past, diff);
}

function getNewCursorPos(cursorIndex, past, present) {
    let patches = getPatches(past, present);
    let pos = {line: 0, ch: -1};
    patches.forEach(patch => {
        let index = patch.start1;
        patch.diffs.forEach(diff => {
            switch (diff[0]) {
                case 1:
                    if (index < cursorIndex)
                        cursorIndex += diff[1].length;
                case 0:
                    index += diff[1].length;
                    break;
                case -1:
                    if (index < cursorIndex)
                        cursorIndex -= Math.min(cursorIndex - index, diff[1].length);
                    break;
            }
        });
    });

    for (let i = 0; i < cursorIndex && i < present.length; i++) {
        if (present[i] === '\n') {
            pos.line += 1;
            pos.ch = 0;
        } else pos.ch += 1;
    }
    return pos;
}

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
    let ct = document.getElementById('link-copy-hidden');
    ct.select();
    ct.setSelectionRange(0, 99999);
    document.execCommand("copy");
}

function setLink() {
    document.getElementById('link-copy').innerHTML = window.location.href + ' <span class="glyphicon glyphicon-duplicate">';
    document.getElementById('link-copy-hidden').value = window.location.href;
}