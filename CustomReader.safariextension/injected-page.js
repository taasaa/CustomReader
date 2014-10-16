function checkOkayToDoHotkey(event) {
	var forbiddenTargets = ['INPUT','BUTTON','SELECT','TEXTAREA'];
	var elementIsForbidden = (forbiddenTargets.indexOf(event.target.nodeName) > -1);
	var elementIsEditable = event.target.isContentEditable;
	return (event.metaKey || (!elementIsForbidden && !elementIsEditable));
}
function forwardKeydownEvent(e) {
	if ([32,33,34,35,36,38,40].indexOf(e.which) === -1)
		return;
	if (e.metaKey || e.altKey || e.ctrlKey || (e.shiftKey && e.which !== 32))
		return;
	e.preventDefault();
	e.stopPropagation();
	var ee = {};
	var props = ['which','altKey','ctrlKey','metaKey','shiftKey'];
	for (var i = 0; i < props.length; i++)
		ee[props[i]] = e[props[i]];
	// console.log('forwarding kbd evt:', ee);
	safari.self.tab.dispatchMessage('forwardKeydownEvent', ee);
}
function handleKeydown(e) {
	var props = ['which','altKey','ctrlKey','metaKey','shiftKey'];
	var match = props.every(function (prop) {
		return e[prop] === settings.hotkeys['activate'][prop];
	});
	if (match) {
		if (checkOkayToDoHotkey(e)) {
			e.preventDefault(); e.stopPropagation();
			safari.self.tab.dispatchMessage('hotkeyWasPressed', 'activate'); 
		}
	}
}
function handleMessage(e) {
	switch (e.name) {
		case 'forwardKeyboardEvents':
			window.addEventListener('keydown', forwardKeydownEvent, true);
			// document.documentElement.style.overflow = 'hidden';
			break;
		case 'stopForwardingKeyboardEvents':
			window.removeEventListener('keydown', forwardKeydownEvent, true);
			// document.documentElement.style.overflow = '';
			break;
		case 'receiveSetting':
			settings[e.message.key] = e.message.value;
			break;
		case 'receiveSettings':
			var receivedSettings = JSON.parse(e.message);
			for (var key in receivedSettings)
				settings[key] = receivedSettings[key];
			break;
		default: break;
	}
}

var settings = {};
if (window === top) {
	safari.self.tab.dispatchMessage('passPageSettings');
	safari.self.addEventListener('message', handleMessage, false);
	document.addEventListener('keydown', handleKeydown, false);
}
