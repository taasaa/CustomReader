var sa = safari.application;
var se = safari.extension;
var defaults;
var waitTimers = [];
var waitingButton = null;
var defaultPopover = 'settingsP';
var safariVersion = /AppleWebKit\/(\d+)\./.exec(navigator.appVersion)[1] * 1;
var safariGte61 = (safariVersion >= 537);
var safariGte90 = (safariVersion >= 601);
var printCSS = document.getElementById('print-css').textContent.replace(/^\n/, '').replace(/\t/g, '').replace();

function applyCSSToStyleSetting(css) {
	dummyStyleElement.textContent = css;
	var style = se.settings.style;
	var dummyStylesheet = document.styleSheets[0];
	for (var r, selectorFound = false, i = dummyStylesheet.rules.length - 1; i >= 0; i--) {
		r = dummyStylesheet.rules[i];
		if (r.selectorText == '#article' && safariGte61) {
			style.bgColor = r.style.backgroundColor ? rgb2Hex(r.style.backgroundColor) : style.bgColor;
			style.pageWidth = r.style.width.match('px') ? getLength(r.style.width) : style.pageWidth;
		}
		else if (r.selectorText == '.page') {
			style.bodyFont = r.style.fontFamily.replace(/['"]/g,'') || style.bodyFont;
			style.textColor = r.style.color ? rgb2Hex(r.style.color) : style.textColor;
			if (safariGte61) {
				style.bgColor = r.style.backgroundColor ? rgb2Hex(r.style.backgroundColor) : style.bgColor;
				style.pageWidth = r.style.width.match('px') ? getLength(r.style.width) : style.pageWidth;
			}
		}
		else if (r.selectorText == '.page > *') {
			style.zoomFactor = r.style.zoom || style.zoomFactor;
		}
		else if (r.selectorText == 'p') {
			style.align = r.style.textAlign || style.align;
			if (hasLength(r.style.marginTop) && hasLength(r.style.marginBottom) && !hasLength(r.style.textIndent)) {
				style.grafs = 'space';
			} else
			if (!hasLength(r.style.marginTop) && !hasLength(r.style.marginBottom) && hasLength(r.style.textIndent)) {
				style.grafs = 'indent';
			} else style.grafs = '';
		}
		else if (r.selectorText == 'h1, h2, h3, h4, h5, h6') {
			style.headingFont = r.style.fontFamily.replace(/['"]/g,'') || style.headingFont;
		}
	}
	console.log('Modified style setting:', style);
	se.settings.style = style;
}
function applyStyleChange(data) {
	var style = se.settings.style;
	style[data.key] = data.value;
	se.settings.style = style;
	localStorage.css = editStylesheetText(data, localStorage.css);
	passCSSToAllReaders(localStorage.css);
	passPrintStylesToAllReaders(getPrintRules());
}
function constructStylesheet(rules) {
	var ss = '';
	for (var i = 0; i < rules.length; i++)
		ss += formatRule(rules[i].cssText) + '\n';
	return ss.replace(/(rgb\([^\)]*\))/g, rgb2Hex);
}
function editDummyStylesheet(selector, property, value, priority) {
	var dummyStylesheet = document.styleSheets[0];
	for (var r, selectorFound = false, i = dummyStylesheet.rules.length - 1; i >= 0; i--) {
		r = dummyStylesheet.rules[i];
		if (r.selectorText === selector) {
			r.style.setProperty(property, value, priority);
			selectorFound = true;
			break;
		}
	}
	if (!selectorFound) {
		dummyStylesheet.addRule(selector, property + ': ' + value + (priority ? ' !' + priority : ''));
	}
	return constructStylesheet(dummyStylesheet.rules);
}
function editStylesheetText(data, stylesheet) {
	var priLt61 = safariGte61 ? null : 'important';
	var priGte90 = safariGte90 ? 'important' : null;
	switch (data.key) {
		case 'bodyFont':
			stylesheet = editDummyStylesheet('.page', 'font-family', '"' + data.value + '"', priLt61);
			break;
		case 'headingFont':
			stylesheet = editDummyStylesheet('h1, h2, h3, h4, h5, h6', 'font-family', '"' + data.value + '"', priLt61);
			break;
		case 'textColor':
			stylesheet = editDummyStylesheet('.page', 'color', data.value, priGte90);
			break;
		case 'bgColor':
			stylesheet = editDummyStylesheet('#article', 'background-color', data.value, priGte90);
			if (!safariGte61) {
				stylesheet = editDummyStylesheet('.page', 'background-color', data.value, null);
			} break;
		case 'align':
			stylesheet = editDummyStylesheet('p', 'text-align', data.value, null);
			break;
		case 'grafs':
			if (data.value === 'space') {
				stylesheet = editDummyStylesheet('p', 'margin-top', '1em', null);
				stylesheet = editDummyStylesheet('p', 'margin-bottom', '1em', null);
				stylesheet = editDummyStylesheet('p', 'text-indent', '0', null);
			} else {
				stylesheet = editDummyStylesheet('p', 'margin-top', '0', null);
				stylesheet = editDummyStylesheet('p', 'margin-bottom', '0', null);
				stylesheet = editDummyStylesheet('p', 'text-indent', '2em', null);
			} break;
		case 'pageWidth':
			var selector = safariGte61 ? '#article' : '.page';
			stylesheet = editDummyStylesheet(selector, 'width', data.value + 'px', null);
			break;
		case 'zoomFactor':
			stylesheet = editDummyStylesheet('.page > *', 'zoom', data.value, null);
			break;
		default: break;
	}
	return stylesheet;
}
function formatRule(ruleText) {
	return ruleText.replace('{ ','{\n    ').replace(/; /g,';\n    ').replace('    }','}');
}
function getButtonForActiveWindow() {
	function winIsActive(button) {
		return button.browserWindow === sa.activeBrowserWindow;
	}
	return se.toolbarItems.filter(winIsActive)[0];
}
function getConfirmation(question, callback) {
	var frontButton = getButtonForActiveWindow();
	if (!frontButton || !se.popovers) {
		callback(confirm(question));
	} else {
		if (frontButton.popover)
			frontButton.popover.hide();
		frontButton.popover = getPopover('confirmP');
		frontButton.popover.contentWindow.initialize(question, callback);
		frontButton.showPopover();
	}
}
function getDefaults() {
	var defaultCssContainerId = 'default-css-' + (safariGte61 ? '61' : '60');
	var style61 = {
		bodyFont    : 'Georgia',
		headingFont : 'Helvetica',
		textColor   : '#414141',
		bgColor     : '#FBFBFB',
		align       : 'start',
		grafs       : 'space',
		pageWidth   : 800,
		zoomFactor  : 1,
	};
	var style60 = {
		bodyFont    : 'Georgia',
		headingFont : 'Helvetica',
		textColor   : '#000000',
		bgColor     : '#f3f2ee',
		align       : 'start',
		grafs       : 'space',
		pageWidth   : 660,
		zoomFactor  : 1,
	};
	return {
		suppressExitClick    : false,
		showReaderCMItem     : false,
		lastSettingsTabIndex : 0,
		autoread             : [],
		style                : safariGte61 ? style61 : style60,
		printFontSize        : 10,
		printBlack           : true,
		printImagesReduce    : false,
		printMarginWidth     : 10,
		css : document.getElementById(defaultCssContainerId).textContent
			.replace(/^\n/, '').replace(/\t/g, '').replace(),
		hotkeys : {
			'activate': {
				which         : 82,
				keyCode       : 82,
				keyIdentifier : "U+0052",
				altKey        : false,
				ctrlKey       : false,
				metaKey       : false,
				shiftKey      : true
			},
			'customize': {
				which         : 82,
				keyCode       : 82,
				keyIdentifier : "U+0052",
				altKey        : false,
				ctrlKey       : true,
				metaKey       : false,
				shiftKey      : false
			}
		}
	};
}
function getHostnameFromUrl(url) {
	se.tempAnchor = se.tempAnchor || document.createElement('a');
	se.tempAnchor.href = url;
	return se.tempAnchor.hostname;
}
function getLength(string) {
	var n = string.match(/\d+/);
	return n ? n[0] * 1 : null;
}
function getPopover(id) {
	return se.popovers.filter(function (p) {
		return p.identifier === id;
	})[0];
}
function getPrintRules() {
	if (se.settings.style.grafs == "space")
		var pmt = '1em', pmb = '1em', pti = '0';
	else
		var pmt = '0', pmb = '0', pti = '2em';
	return printCSS
		.replace('$bf',  se.settings.style.bodyFont)
		.replace('$hf',  se.settings.style.headingFont)
		.replace('$pta', se.settings.style.align)
		.replace('$tc',  se.settings.printBlack ? '#000' : se.settings.style.textColor)
		.replace('$pfs', se.settings.printFontSize)
		.replace(/\$prm/g, se.settings.printMarginWidth)
		.replace('$pmt', pmt).replace('$pmb', pmb).replace('$pti', pti);
}
function handleCommand(event) {
	switch (event.command) {
		case 'toggleReader':
			if (event.target instanceof SafariExtensionToolbarItem && sa.activeBrowserWindow.activeTab.reader.visible)
				openSettingsPanel(sa.activeBrowserWindow.activeTab.reader);
			else
				toggleReader();
			break;
		case 'openSettings':
			var frontButton = getButtonForActiveWindow();
			if (frontButton && se.popovers) {
				frontButton.popover = getPopover('settingsP');
				frontButton.showPopover();
			} else {
				sa.activeBrowserWindow.activeTab.reader.dispatchMessage(
					'insertSettingsBox', se.settings.settingsBoxPosition
				);
			} break;
		default: break;
	}
}
function handleContextMenu(event) {
	if (event.target.reader && event.target.reader.available && se.settings.showReaderCMItem) {
		event.contextMenu.appendContextMenuItem('toggleReader', 'Activate Reader');
	}
	if (event.userInfo == 'reader') {
		event.contextMenu.appendContextMenuItem('openSettings', 'CustomReader Settings');
	}
}
function handleMessage(event) {
	var readerTarget = safariGte90 ? event.target.reader : event.target;
	switch (event.name) {
		case 'forwardKeydownEvent':
			event.target.reader.dispatchMessage('handleKeydownEvent', event.message);
			break;
		case 'forwardPreview':
			readerTarget.dispatchMessage('preview', event.message);
			break;
		case 'forwardRevert':
			readerTarget.dispatchMessage('revert', event.message);
			break;
		case 'hotkeyWasPressed':
			if (event.message === 'activate')
				toggleReader();
			else if (event.message === 'customize')
				openSettingsPanel(readerTarget);
			break;
		case 'openSettingsBox':
			openSettingsPanel(readerTarget);
			break;
		case 'passAllSettings':
			readerTarget.dispatchMessage('receiveAllSettings', JSON.stringify(se.settings));
			break;
		case 'passMarkup':
			readerTarget.dispatchMessage('receiveMarkup', {
				key   : event.message,
				value : localStorage[event.message]
			});
			break;
		case 'passPrintStyles':
			readerTarget.dispatchMessage('receivePrintStyles', getPrintRules());
			break;
		case 'passPageSettings':
			var settings = {};
			var relevantProperties = ['hotkeys'];
			for (var i = 0; i < relevantProperties.length; i++)
				settings[relevantProperties[i]] = se.settings[relevantProperties[i]];
			event.target.page && event.target.page.dispatchMessage('receiveSettings', JSON.stringify(settings));
			break;
		case 'passReaderSettings':
			var settings = {};
			var relevantProperties = ['hotkeys','printImagesReduce','scrollThrottle','suppressExitClick'];
			for (var i = 0; i < relevantProperties.length; i++)
				settings[relevantProperties[i]] = se.settings[relevantProperties[i]];
			readerTarget.dispatchMessage('receiveSettings', JSON.stringify(settings));
			break;
		case 'passSetting':
			event.target.page.dispatchMessage('receiveSetting', {
				key   : event.message,
				value : se.settings[event.message]
			});
			break;
		case 'removeSettingsBox':
			readerTarget.dispatchMessage('removeSettingsBox');
			break;
		case 'resetHotkey':
			var name = event.message;
			var hotkeys = se.settings.hotkeys;
			hotkeys[name] = defaults.hotkeys[name];
			se.settings.hotkeys = hotkeys;
			break;
		case 'restoreDefaultStyleSettings':
			se.settings.style = defaults.style;
			passSettingToAllReaders('style');
			var tempCSS = localStorage.css;
			for (var key in defaults.style)
				tempCSS = editStylesheetText({ key: key, value: defaults.style[key] }, tempCSS);
			localStorage.css = tempCSS;
			passCSSToAllReaders(localStorage.css);
			break;
		case 'restoreDefaultValue':
			localStorage[event.message] = defaults[event.message];
			if (event.message == 'css') {
				se.settings.style = defaults.style;
				var pageTarget = safariGte90 ? event.target.page : event.target;
				pageTarget.dispatchMessage('receiveStyleSettings', JSON.stringify(se.settings.style));
			}
			readerTarget.dispatchMessage('receiveMarkup', {
				key   : event.message,
				value : localStorage[event.message]
			});
			break;
		case 'saveAutoreads':
			se.settings.autoread = event.message;
			break;
		case 'saveMarkup':
			localStorage[event.message.key] = event.message.value;
			if (event.message.key === 'css') {
				passCSSToAllReaders(event.message.value);
				applyCSSToStyleSetting(event.message.value);
			}
			break;
		case 'saveSetting':
			se.settings[event.message.key] = event.message.value;
			break;
		case 'savePrintSetting':
			se.settings[event.message.key] = event.message.value;
			passPrintStylesToAllReaders(getPrintRules());
			break;
		case 'saveSettingAndPassToReaders':
			se.settings[event.message.key] = event.message.value;
			passSettingToAllReaders(event.message.key);
			break;
		case 'saveSettingsBoxPosition':
			se.settings.settingsBoxPosition = event.message;
			break;
		case 'saveStyleSetting':
			applyStyleChange(event.message);
			break;
		case 'propagatePrintStyles':
			passPrintStylesToAllReaders(getPrintRules());
			break;
		default: break;
	}
}
function handleReaderActivate(event) {
	if (!(event.target instanceof SafariReader))
		return;
	var tab = event.target.tab;
	tab.reader.dispatchMessage('youAreNowActive');
	tab.page.dispatchMessage('forwardKeyboardEvents');
}
function handleReaderAvailable(event) {
	if (!(event.target instanceof SafariReader))
		return;
	var tab = event.target.tab;
	if (tab === sa.activeBrowserWindow.activeTab) {
		var button = getButtonForActiveWindow();
		if (button) {
			button.disabled = false;
			button.toolTip = 'Activate Safari Reader';
		}
	}
	if (se.settings.autoread.length) {
		var match = se.settings.autoread.some(function (pattern) {
			return new RegExp(pattern).test(tab.url);
		});
		if (match) {
			console.log('Autoread match at "' + tab.url + '"');
			toggleReader(tab);
		}
	}
}
function handleReaderDeactivate(event) {
	if (!(event.target instanceof SafariReader))
		return;
	var tab = event.target.tab;
	tab.page.dispatchMessage('stopForwardingKeyboardEvents');
}
function handleSettingChange(event) {
	if (event.newValue !== event.oldValue) {
		switch (event.key) {
			case 'showReaderCMItem':
				passSettingToAllPages(event.key);
			break;
		}
	}
}
function handleValidate(event) {
	if (event.command === 'toggleReader') {
		var reader = sa.activeBrowserWindow.activeTab.reader;
		event.target.disabled = !reader.visible && !reader.available;
		event.target.toolTip = reader.available
			? (reader.visible ? 'Open CustomReader Settings' : 'Activate Safari Reader')
			: 'Safari Reader is not available';
	}
}
function hasLength(string) {
	var dm = string.match(/\d+/);
	if (!dm) {
		return false;
	} else {
		return (dm[0] * 1) > 0;
	}
}
function openSettingsPanel(reader) {
	var frontButton = getButtonForActiveWindow();
	if (frontButton && se.popovers) {
		frontButton.popover = getPopover('settingsP');
		frontButton.showPopover();
	} else {
		reader.dispatchMessage('insertSettingsBox', se.settings.settingsBoxPosition);
	}
}
function passCSSToAllReaders(css) {
	for (var i = 0; i < sa.browserWindows.length; i++) {
		thisWindow = sa.browserWindows[i];
		for (var j = 0; j < thisWindow.tabs.length; j++) {
			thisTab = thisWindow.tabs[j];
			if (thisTab.reader) {
				console.log('Passing settings to reader at ' + thisTab.url);
				thisTab.reader.dispatchMessage('receiveMarkup', { key: 'css', value: css });
			}
		}
	}
}
function passPrintStylesToAllReaders(css) {
	for (var i = 0; i < sa.browserWindows.length; i++) {
		thisWindow = sa.browserWindows[i];
		for (var j = 0; j < thisWindow.tabs.length; j++) {
			thisTab = thisWindow.tabs[j];
			if (thisTab.reader) {
				console.log('Passing print styles to reader at ' + thisTab.url);
				thisTab.reader.dispatchMessage('receivePrintStyles', css);
			}
		}
	}
}
function passSettingToAllPages(key) {
	var thisWindow = {};
	var thisTab = {};
	var message = {
		key   : key,
		value : se.settings[key]
	};
	for (var i = 0; i < sa.browserWindows.length; i++) {
		thisWindow = sa.browserWindows[i];
		for (var j = 0; j < thisWindow.tabs.length; j++) {
			thisTab = thisWindow.tabs[j];
			if (thisTab.page !== undefined) {
				console.log('Passing settings to page at ' + thisTab.url);
				thisTab.page.dispatchMessage('receiveSetting', message);
			}
		}
	}
}
function passSettingToAllReaders(key) {
	var thisWindow = {};
	var thisTab = {};
	var message = {
		key   : key,
		value : se.settings[key]
	};
	for (var i = 0; i < sa.browserWindows.length; i++) {
		thisWindow = sa.browserWindows[i];
		for (var j = 0; j < thisWindow.tabs.length; j++) {
			thisTab = thisWindow.tabs[j];
			if (thisTab.reader) {
				console.log('Passing settings to reader at ' + thisTab.url);
				thisTab.reader.dispatchMessage('receiveSetting', message);
			}
		}
	}
}
function rgb2Hex(rgb) {
	var levels = rgb.match(/rgb\((\d+), (\d+), (\d+)\)/);
	levels.shift();
	var hex = '#';
	for (var s, i = 0; i < levels.length; i++) {
		s = (levels[i] * 1).toString(16);
		if (s.length < 2)
			s = '0' + s;
		hex += s;
	}
	return hex;
}
function setButtonIcon(button, filename) {
	button.image = se.baseURI + filename + '.png';
	return button;
}
function toggleReader(tab) {
	if (!tab) tab = sa.activeBrowserWindow.activeTab;
	if (!tab.reader)
		return;
	if (tab.reader.visible) {
		tab.reader.exit();
	} else {
		tab.reader.enter();
	}
}
function initializeSettings() {
	var lastVersion = se.settings.lastVersion;
	for (var key in defaults) {
		if (se.settings[key] == undefined) {
			se.settings[key] = defaults[key];
		}
	}
	delete se.settings.css;
	if (localStorage.css == undefined) {
		localStorage.css = se.settings.css || defaults.css;
	}
	if (!lastVersion) {
		alert('CustomReader is now installed. The extension will take effect on new tabs.');
	} else {
		if (lastVersion < 7) {
			if (safariGte61) {
				se.settings.style = defaults.style;
				localStorage.css = defaults.css;
				delete se.settings.css;
			} else {
				se.settings.installedPre61 = true;
			}
		}
		if (lastVersion < 16) {
			se.settings.showReaderCMItem = !se.settings.hideReaderCMItem;
			delete se.settings.hideReaderCMItem;
		}
	}
	if (safariGte61 && se.settings.installedPre61) {
		se.settings.style = defaults.style;
		localStorage.css = defaults.css;
		delete se.settings.css;
		delete se.settings.installedPre61;
	}
	se.settings.lastVersion = 29;
}

window.onload = function () {
	defaults = getDefaults();
	initializeSettings();
	dummyStyleElement = document.head.insertBefore(document.createElement('style'), document.querySelector('style'));
	dummyStyleElement.type = 'text/css';
	dummyStyleElement.textContent = localStorage.css || '';
};

sa.addEventListener('activate', handleReaderActivate, true);
sa.addEventListener('available', handleReaderAvailable, false);
sa.addEventListener('command', handleCommand, false);
sa.addEventListener('contextmenu', handleContextMenu, false);
sa.addEventListener('deactivate', handleReaderDeactivate, true);
sa.addEventListener('message', handleMessage, false);
sa.addEventListener('validate', handleValidate, false);
se.settings.addEventListener('change', handleSettingChange, false);

se.addContentScriptFromURL(se.baseURI + 'injected-page.js', ['http:/*/*','https:/*/*'], null, true);
se.addContentScriptFromURL(se.baseURI + 'injected-reader.js', ['safari-reader://*/*'], null, true);
