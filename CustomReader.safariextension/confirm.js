function getMyButton() {
	return se.toolbarItems.filter(function (ti) {
		return (
			ti.browserWindow === safari.application.activeBrowserWindow && 
			ti.popover && ti.popover.identifier === safari.self.identifier
		);
	})[0];
}
function handleAnswer(answer) {
	yesAction(answer);
	window.removeEventListener('blur', handleWinBlur, false);
	safari.self.hide();
	getMyButton().popover = gw.getPopover(gw.defaultPopover);
}
function handleKeyDown() {
	switch (event.which) {
		case  9:	// tab
			event.preventDefault();
			if (event.target.id === 'yesbutton') {
				document.querySelector('#nobutton').focus();
			} else if (event.target.id === 'nobutton') {
				document.querySelector('#yesbutton').focus();
			} break;
		case 78:	// n
			document.querySelector('#nobutton').click();
			break;
		case 89:	// y
			document.querySelector('#yesbutton').click();
			break;
		default: return;
	}
}
function handleYes() {
	event.preventDefault();
	handleAnswer(true);
}
function handleNo() {
	event.preventDefault();
	handleAnswer(false);
}
function handleWinBlur(e) {
	handleAnswer(false);
}
function initialize(question, callback) {
	window.addEventListener('blur', handleWinBlur, false);
	window.addEventListener('keydown', handleKeyDown, false);
	document.querySelector('#question').innerHTML = question;
	yesAction = callback || console.log;
	document.querySelector('#yesbutton').focus();
}

var se = safari.extension;
var gw = se.globalPage.contentWindow;