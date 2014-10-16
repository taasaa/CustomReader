window.onload = initialize;

function addEventListeners() {
	for (var h = 0; h < tabs.length; h++) {
		tabs[h].onclick = function (e) {
			selectTab(e.currentTarget.getAttribute('index'));
		};
	}
	
	bodyFontInput.onchange = handleFontInputChange;
	bodyFontMenu.onchange = handleFontMenuChange;
	headingFontInput.onchange = handleFontInputChange;
	headingFontMenu.onchange = handleFontMenuChange;
	textColorInput.onchange = handleColorChange;
	bgColorInput.onchange = handleColorChange;
	for (var i = 0; i < textAlignRadio.length; i++) {
		textAlignRadio[i].onchange = function (e) {
			saveStyleSetting({ key:'align', value: e.target.value });
		};
	}
	for (var j = 0; j < paragraphRadio.length; j++) {
		paragraphRadio[j].onchange = function (e) {
			saveStyleSetting({ key:'grafs', value: e.target.value });
		};
	}
	widthInput.onchange = function (e) {
		saveStyleSetting({ key:'pageWidth', value: e.target.value });
	};
	document.querySelector('label[for="widthinput"]').onclick = function (e) {
		widthInput.focus();
	};
	zoomInput.onchange = function (e) {
		var zoom = e.target.value * 1;
		if (zoom > 4)
			e.target.value = zoom = 4;
		else if (zoom < 0.5)
			e.target.value = zoom = 0.5;
		saveStyleSetting({ key:'zoomFactor', value: zoom });
	};
	document.querySelector('#basicrestore').onclick = restoreDefaultStyleSettings;
	
	for (var k = 0; k < editors.length; k++) {
		editors[k].onfocus = onEditorFocus;
		editors[k].onkeydown = onEditorKeydown;
	}
	for (var l = 0; l < editorButtons.length; l++) {
		editorButtons[l].onclick = function (e) {
			if (e.target.className.match('save')) {
				saveEditorValue(e.target.parentElement.previousElementSibling);
			} else 
			if (e.target.className.match('revert')) {
				revertEditorValue(e.target.parentElement.previousElementSibling);
			} else
			if (e.target.className.match('default')) {
				restoreDefaultValue(e.target.parentElement.previousElementSibling);
			}
		};
	}
	
	document.querySelector('#autoread button.save').onclick = saveAutoreads;
	
	ahkInput.onfocus = handleHotkeyFocus;
	chkInput.onfocus = handleHotkeyFocus;
	ahkInput.onkeydown = handleHotKeyDown;
	chkInput.onkeydown = handleHotKeyDown;
	document.querySelector('#ahkrestorebutton').onclick = resetHotkey;
	document.querySelector('#chkrestorebutton').onclick = resetHotkey;
	
	document.querySelector('input[name="suppressExitClick"]').onchange = function (e) {
		if (selfIsPopover)
			se.settings[e.target.name] = e.target.checked;
		else {
			safari.self.tab.dispatchMessage('saveSettingAndPassToReaders', {
				key   : e.target.name,
				value : e.target.checked
			});
		}
	};
	document.querySelector('input[name="showReaderCMItem"]').onchange = function (e) {
		if (selfIsPopover)
			se.settings[e.target.name] = e.target.checked;
		else {
			safari.self.tab.dispatchMessage('saveSetting', { 
				key   : e.target.name,
				value : e.target.checked
			});
		}
	};
	document.querySelector('input[name="scrollThrottle"]').onchange = function (e) {
		if (selfIsPopover) {
			se.settings[e.target.name] = e.target.value;
			gw.passSettingToAllReaders('scrollThrottle');
		} else {
			safari.self.tab.dispatchMessage('saveSettingAndPassToReaders', {
				key   : e.target.name,
				value : e.target.value
			});
		}
	};
	document.querySelector('input[name="printFontSize"]').onchange = function (e) {
		if (selfIsPopover) {
			se.settings[e.target.name] = parseInt(e.target.value);
			gw.passPrintStylesToAllReaders(gw.getPrintRules());
		} else {
			safari.self.tab.dispatchMessage('saveSetting', {
				key   : e.target.name,
				value : parseInt(e.target.value)
			});
			safari.self.tab.dispatchMessage('propagatePrintStyles');
		}
	};
	
	if (selfIsPopover) {
		window.onfocus = handlePopoverFocus;
		var links = document.querySelectorAll('a[href]');
		for (var m = 0; m < links.length; m++) {
			links[m].onclick = function (e) {
				e.preventDefault();
				sa.activeBrowserWindow.openTab().url = e.target.href;
			};
		}
	}
	document.onkeydown = handleKeydown;
}
function checkOkayToDoHotkey(event) {
	var forbiddenTargets = ['INPUT','BUTTON','SELECT','TEXTAREA'];
	var elementIsForbidden = (forbiddenTargets.indexOf(event.target.nodeName) > -1);
	var elementIsEditable = event.target.isContentEditable;
	return (event.metaKey || (!elementIsForbidden && !elementIsEditable));
}
function goAway() {
	if (selfIsPopover) {
		safari.self.hide();
	} else {
		safari.self.tab.dispatchMessage('removeSettingsBox');
	}
}
function handleColorChange(e) {
	var key = (e.target === textColorInput) ? 'textColor' : 'bgColor';
	saveStyleSetting({ key: key, value: '#' + e.target.color });
}
function handleFontInputChange(e) {
	var key = (e.target === bodyFontInput) ? 'bodyFont' : 'headingFont';
	var fontName = e.target.value;
	var menu = (key === 'bodyFont') ? bodyFontMenu : headingFontMenu;
	var warning = (key === 'bodyFont') ? bodyFontWarning : headingFontWarning;
	warning.style.visibility = 'hidden';
	if (!fontDetective.detect(fontName))
		warning.style.visibility = 'visible';
	menu.selectedIndex = 0;
	for (var i = 0; i < menu.options.length; i++) {
		if (menu.options[i].value === fontName) {
			menu.selectedIndex = i;
			break;
		}
	}
	saveStyleSetting({ key: key, value: fontName });
}
function handleFontMenuChange(e) {
	var key = (e.target === bodyFontMenu) ? 'bodyFont' : 'headingFont';
	var fontName = e.target.options[e.target.selectedIndex].value;
	var input = (key === 'bodyFont') ? bodyFontInput : headingFontInput;
	var warning = (key === 'bodyFont') ? bodyFontWarning : headingFontWarning;
	warning.style.visibility = 'hidden';
	input.value = fontName;
	if (fontName == '')
		input.focus();
	else
		saveStyleSetting({ key: key, value: fontName });
}
function handleHotKeyDown(e) {
	e.stopPropagation();
	switch (e.which) {
		case 27:	// escape
			e.target.blur();
			break;
		case 37:	// left
		case 38:	// up
		case 39:	// right
		case 40:	// down
			e.preventDefault();
			break;
		case  9:	// tab
		case 16:	// shift
		case 17:	// ctrl
		case 18:	// option
		case 91:	// command-left
		case 93:	// command-right
			break;
		default:
			e.preventDefault();
			saveHotkey(e);
		break;
	}
}
function handleHotkeyFocus(e) {
	setTimeout(function () {
		e.target.select();
	}, 10);
}
function handleKeydown(e) {
	var props = ['which','altKey','ctrlKey','metaKey','shiftKey'];
	var match = props.every(function (prop) {
		return e[prop] == settings.hotkeys['customize'][prop];
	});
	if (match) {
		if (checkOkayToDoHotkey(e)) {
			e.preventDefault();
			e.stopPropagation();
			goAway();
		}
	} else
	if (e.which === 27) {
		e.preventDefault();
		e.stopPropagation();
		goAway();
	}
}
function handleMessage(e) {
	console.log('Settings box received message "' + e.name + '" from:', e.target, e.message);
	switch (e.name) {
		case 'receiveAllSettings':
			var receivedSettings = JSON.parse(e.message);
			for (var key in receivedSettings)
				settings[key] = receivedSettings[key];
			selectTab(settings.lastSettingsTabIndex);
			populateBasicForm();
			populateAutoReadForm();
			populateSettingsForm();
			break;
		case 'receiveMarkup':
			self[e.message.key] = e.message.value;
			document.querySelector('#' + e.message.key + ' textarea').value = e.message.value;
			break;
		case 'receiveStyleSettings':
			settings.style = JSON.parse(e.message);
			populateBasicForm();
			break;
		case 'receiveSetting':
			settings[e.message.key] = e.message.value;
			switch (e.message.key) {
				case 'hotkeys':
					populateHotkeyInput('activate');
					populateHotkeyInput('customize');
					break;
				case 'style':
					populateBasicForm();
					break;
				default: break;
			} break;
		default: break;
	}
}
function handlePopoverFocus() {
	populateFontMenu(bodyFontMenu, settings.style.bodyFont);
	populateFontMenu(headingFontMenu, settings.style.headingFont);
	populateTextareas();
}
function initialize() {
	se = safari.extension;
	selfIsPopover = !!safari.self.identifier;
	tabs = document.querySelector('#tabs').children;
	sections = document.querySelectorAll('section');
	textareas = document.querySelectorAll('textarea');
	editors = document.querySelectorAll('.editor');
	editorButtons = document.querySelectorAll('.editorbuttons button');
	bodyFontInput = document.querySelector('#bodyfontinput');
	bodyFontMenu = document.querySelector('#bodyfontmenu');
	bodyFontWarning = document.querySelector('#bodyfontwarning');
	headingFontInput = document.querySelector('#headingfontinput');
	headingFontMenu = document.querySelector('#headingfontmenu');
	headingFontWarning = document.querySelector('#headingfontwarning');
	textColorInput = document.querySelector('#textcolorinput');
	bgColorInput = document.querySelector('#bgcolorinput');
	textAlignRadio = document.querySelectorAll('input[name="textalignradio"]');
	paragraphRadio = document.querySelectorAll('input[name="paragraphradio"]');
	zoomInput = document.querySelector('#zoominput');
	widthInput = document.querySelector('#widthinput');
	ahkInput = document.querySelector('#ahkinput');
	chkInput = document.querySelector('#chkinput');
	standardFonts = [
		'Andale Mono','Arial','Baskerville','Big Caslon','Book Antiqua','Calibri','Cambria','Candara','Consolas',
		'Constantia','Corbel','Courier','Courier New','Didot','Futura','Geneva','Georgia','Gill Sans','Helvetica',
		'Helvetica Neue','Hoefler Text','Lucida Console','Lucida Grande','Lucida Sans Unicode','Monaco','Menlo',
		'Microsoft Sans Serif','Optima','Palatino','Palatino Linotype','Segoe UI','Tahoma','Times','Times New Roman',
		'Trebuchet MS','Verdana'
	];
	fontDetective = new Detector();
	shiftTabs();
	if (selfIsPopover) {
		sa = safari.application;
		gw = se.globalPage.contentWindow;
		settings = se.settings;
		css = localStorage.css;
		console = gw.console;
		populateBasicForm();
		populateTextareas();
		populateSettingsForm();
		selectTab(settings.lastSettingsTabIndex);
	} else {
		settings = {};
		document.body.className += ' iframed';
		safari.self.addEventListener('message', handleMessage, false);
		safari.self.tab.dispatchMessage('passAllSettings');
		safari.self.tab.dispatchMessage('passMarkup', 'css');
		window.focus();
	}
	addEventListeners();
}
function insertAtCaret(textarea, text) {
	var scrollPos = textarea.scrollTop;
	var strPos = textarea.selectionStart;
	var front = (textarea.value).substring(0,strPos);
	var back = (textarea.value).substring(strPos,textarea.value.length);
	textarea.value = front + text + back;
	strPos = strPos + text.length;
	textarea.selectionStart = strPos;
	textarea.selectionEnd = strPos;
	textarea.scrollTop = scrollPos;
	textarea.focus();
}
function isInstalled(font) {
	return fontDetective.detect(font);
}
function onEditorFocus(e) {
	e.target.addEventListener('keypress', onEditorKeypress, false);
}
function onEditorKeydown(e) {
	var modkeys = e.shiftKey * 1 + e.ctrlKey * 2 + e.altKey * 4 + e.metaKey * 8;
	switch (e.which) {
		case  8:	// backspace
			toggleEditorButtons(e.target, true);
			break;
		case  9:	// tab
			if (modkeys === 0) {
				e.preventDefault();
				insertAtCaret(e.target, '    ');
			} break;
		case 18:	// option
			if (e.target.getAttribute('for') === 'autoread')
				break;
			if (modkeys === 4) {
				e.target.onkeyup = function (ee) {
					if (ee.which === 18)
						togglePreview(e.target, false);
					e.target.onkeyup = null;
				};
				togglePreview(e.target, true);
			} break;
		case 82:	// r
			if (e.target.getAttribute('for') === 'autoread')
				break;
			if (modkeys === 8) {
				e.preventDefault();
				e.stopPropagation();
				e.target.parentElement.querySelector('button.revert').click();
			} break;
		case 83:	// s
			if (modkeys === 8) {
				e.preventDefault();
				e.stopPropagation();
				e.target.parentElement.querySelector('button.save').click();
			} break;
		default: break;
	}
}
function onEditorKeypress(e) {
	toggleEditorButtons(e.target, true);
	e.target.removeEventListener('keypress', onEditorKeypress, false);
}
function populateBasicForm() {
	bodyFontInput.value = settings.style.bodyFont;
	populateFontMenu(bodyFontMenu, settings.style.bodyFont);
	headingFontInput.value = settings.style.headingFont;
	populateFontMenu(headingFontMenu, settings.style.headingFont);
	textColorInput.color.fromString(settings.style.textColor);
	bgColorInput.color.fromString(settings.style.bgColor);
	for (var i = 0; i < textAlignRadio.length; i++)
		textAlignRadio[i].checked = (textAlignRadio[i].value == settings.style.align);
	for (var j = 0; j < paragraphRadio.length; j++)
		paragraphRadio[j].checked = (paragraphRadio[j].value == settings.style.grafs);
	widthInput.value = settings.style.pageWidth;
	zoomInput.value = settings.style.zoomFactor;
}
function populateFontMenu(menu, selectedFont) {
	menu.length = 0;
	var installedFonts = standardFonts.filter(isInstalled);
	menu.add(new Option('(other)', '', false, (installedFonts.indexOf(selectedFont) === -1)));
	for (var fontName, i = 0; i < installedFonts.length; i++) {
		fontName = installedFonts[i];
		menu.add(new Option(fontName, fontName, false, (fontName == selectedFont)));
	}
}
function populateHotkeyInput(name) {
	if (!settings.hotkeys)
		return;
	var hotkey = settings.hotkeys[name];
	var cStr = String.fromCharCode(hotkey.which);
	if (!/[0-9A-Z]/.test(cStr))
		cStr = String.fromCharCode(parseInt(hotkey.keyIdentifier.slice(2), 16));
	if (cStr === ' ')
		cStr = 'Space';
	var mStr = '';
	if (hotkey.ctrlKey)  mStr += '⌃';
	if (hotkey.altKey)   mStr += '⌥';
	if (hotkey.shiftKey) mStr += '⇧';
	if (hotkey.metaKey)  mStr += '⌘';
	document.querySelector('input[name="' + name + '"]').value = mStr + cStr;
}
function populateAutoReadForm() {
	document.querySelector('#autoread textarea').value = settings.autoread.join('\n');
}
function populateSettingsForm() {
	populateHotkeyInput('activate');
	populateHotkeyInput('customize');
	document.querySelector('input[name="suppressExitClick"]').checked = settings.suppressExitClick;
	document.querySelector('input[name="showReaderCMItem"]').checked = settings.showReaderCMItem;
	document.querySelector('input[name="scrollThrottle"]').value = settings.scrollThrottle;
	document.querySelector('input[name="printFontSize"]').value = settings.printFontSize;
}
function populateTextareas() {
	if (selfIsPopover)
		css = localStorage.css;
	document.querySelector('#css textarea').value = css;
	document.querySelector('#autoread textarea').value = settings.autoread.join('\n');
}
function resetHotkey(e) {
	var name = e.target.getAttribute('for');
	if (selfIsPopover) {
		var hotkeys = settings.hotkeys;
		hotkeys[name] = gw.defaults.hotkeys[name];
		settings.hotkeys = hotkeys;
		populateHotkeyInput(name);
	} else safari.self.tab.dispatchMessage('resetHotkey', name);
}
function restoreDefaultStyleSettings() {
	if (selfIsPopover) {
		settings.style = gw.defaults.style;
		populateBasicForm();
		gw.passSettingToAllReaders('style');
		var tempCSS = css;
		for (var key in settings.style)
			tempCSS = gw.editStylesheetText({ key: key, value: settings.style[key] }, tempCSS);
		css = tempCSS;
		populateTextareas();
		gw.passCSSToAllReaders(css);
	} else {
		safari.self.tab.dispatchMessage('restoreDefaultStyleSettings');
	}
}
function restoreDefaultValue(textarea) {
	var type = textarea.getAttribute('for');
	if (selfIsPopover) {
		settings.style = gw.defaults.style;
		textarea.value = self[type] = localStorage[type] = gw.defaults[type];
		populateBasicForm();
		var message = {
			key   : type,
			value : self[type]
		};
		sa.activeBrowserWindow.activeTab.reader.dispatchMessage('receiveMarkup', message);
	} else
		safari.self.tab.dispatchMessage('restoreDefaultValue', type);
	toggleEditorButtons(textarea, false);
}
function revertEditorValue(textarea) {
	var type = textarea.getAttribute('for');
	textarea.value = self[type];
	toggleEditorButtons(textarea, false);
}
function saveAutoreads() {
	var ata = document.querySelector('#autoread textarea');
	var reStrings = ata.value.split('\n').map(function (row) {
		return row.trim();
	}).filter(function (row) {
		return row !== '';
	});
	if (selfIsPopover)
		se.settings.autoread = reStrings;
	else
		safari.self.tab.dispatchMessage('saveAutoreads', reStrings);
	toggleEditorButtons(ata, false);
}
function saveEditorValue(textarea) {
	var type = textarea.getAttribute('for');
	var message = {
		key   : type,
		value : textarea.value
	};
	if (selfIsPopover) {
		localStorage[type] = self[type] = textarea.value;
		if (type == 'css') {
			gw.passCSSToAllReaders(textarea.value);
			gw.applyCSSToStyleSetting(textarea.value);
			populateBasicForm();
		}
	} else
		safari.self.tab.dispatchMessage('saveMarkup', message);
	toggleEditorButtons(textarea, false);
}
function saveHotkey(e) {
	e.target.blur();
	var name = e.target.name;
	var hotkey = {};
	var props = ['which','keyCode','keyIdentifier','altKey','ctrlKey','metaKey','shiftKey'];
	for (var i = 0; i < props.length; i++)
		hotkey[props[i]] = e[props[i]];
	var hotkeys = settings.hotkeys;
	hotkeys[name] = hotkey;
	settings.hotkeys = hotkeys;
	if (!selfIsPopover)
		safari.self.tab.dispatchMessage('saveSetting', { key:'hotkeys', value: settings.hotkeys });
	populateHotkeyInput(name);
}
function saveStyleSetting(data) {
	console.log('saveStyleSetting data:', data);
	if (selfIsPopover) {
		gw.applyStyleChange(data);
		populateTextareas();
	} else {
		safari.self.tab.dispatchMessage('saveStyleSetting', data);
	}
}
function selectTab(tabIndex) {
	tabIndex = tabIndex * 1;
	for (var i = 0; i < tabs.length; i++) {
		tabs[i].className = tabs[i].className.replace(' active', '');
	}
	tabs[tabIndex].className += ' active';
	for (var j = 0; j < sections.length; j++) {
		sections[j].className = '';
	}
	sections[tabIndex].className = 'active';
	if (selfIsPopover) {
		se.settings.lastSettingsTabIndex = tabIndex;
	} else {
		safari.self.tab.dispatchMessage('saveSetting', {
			key   : 'lastSettingsTabIndex',
			value : tabIndex
		});
	}
}
function shiftTabs() {
	for (var i = 0; i < tabs.length; i++) {
		tabs[i].style.right = i + 'px';
	}
}
function toggleEditorButtons(textarea, enable) {
	var buttons = textarea.parentElement.querySelectorAll('button.toggleable');
	for (var i = 0; i < buttons.length; i++)
		buttons[i].disabled = (enable) ? false : true;
	textarea.addEventListener('keypress', onEditorKeypress, false);
}
function togglePreview(textarea, turnOn) {
	var pMsgName = (turnOn) ? 'preview' : 'revert';
	var iMsgName = (turnOn) ? 'forwardPreview' : 'forwardRevert';
	var message = {
		key   : textarea.getAttribute('for'),
		value : textarea.value
	};
	if (selfIsPopover)
		sa.activeBrowserWindow.activeTab.reader.dispatchMessage(pMsgName, message);
	else {
		safari.self.tab.dispatchMessage(iMsgName, message);
	}
}
