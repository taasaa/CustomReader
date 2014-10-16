var sa = safari.application;
var se = safari.extension;
var defaults;
var waitTimers = [];
var waitingButton = null;
var defaultPopover = 'settingsP';
var safariVersion = /AppleWebKit\/(\d+)\./.exec(navigator.appVersion)[1] * 1;
var newSafari = (safariVersion >= 537);

function applyCSSToStyleSetting(css) {
	dummyStyleElement.textContent = css;
	var style = se.settings.style;
	var dummyStylesheet = document.styleSheets[0];
	for (var r, selectorFound = false, i = dummyStylesheet.rules.length - 1; i >= 0; i--) {
		r = dummyStylesheet.rules[i];
		if (r.selectorText == '#article' && newSafari) {
			style.bgColor = r.style.backgroundColor ? rgb2Hex(r.style.backgroundColor) : style.bgColor;
			style.pageWidth = r.style.width.match('px') ? getLength(r.style.width) : style.pageWidth;
		} else
		if (r.selectorText == '.page') {
			style.bodyFont = r.style.fontFamily.replace(/['"]/g,'') || style.bodyFont;
			style.textColor = r.style.color ? rgb2Hex(r.style.color) : style.textColor;
			if (newSafari) {
				style.bgColor = r.style.backgroundColor ? rgb2Hex(r.style.backgroundColor) : style.bgColor;
				style.pageWidth = r.style.width.match('px') ? getLength(r.style.width) : style.pageWidth;
			}
		} else
		if (r.selectorText == '.page > *') {
			style.zoomFactor = r.style.zoom || style.zoomFactor;
		} else
		if (r.selectorText == 'p') {
			style.align = r.style.textAlign || style.align;
			if (hasLength(r.style.marginTop) && hasLength(r.style.marginBottom) && !hasLength(r.style.textIndent)) {
				style.grafs = 'space';
			} else
			if (!hasLength(r.style.marginTop) && !hasLength(r.style.marginBottom) && hasLength(r.style.textIndent)) {
				style.grafs = 'indent';
			} else style.grafs = '';
		} else
		if (r.selectorText == 'h1, h2, h3, h4, h5, h6') {
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
	console.log('Editing dummy stylesheet:', selector, property, value);
	var dummyStylesheet = document.styleSheets[0];
	for (var r, selectorFound = false, i = dummyStylesheet.rules.length - 1; i >= 0; i--) {
		r = dummyStylesheet.rules[i];
		if (r.selectorText === selector) {
			r.style.setProperty(property, value, priority);
			selectorFound = true;
			console.log('Modified rule: "' + r.cssText.replace(/(rgb\([^\)]*\))/g, rgb2Hex) + '"');
			break;
		}
	}
	if (!selectorFound) {
		dummyStylesheet.addRule(selector, property + ': ' + value + (priority ? ' !' + priority : ''));
		console.log('Added rule: "' + dummyStylesheet.rules[dummyStylesheet.rules.length - 1].cssText);
	}
	return constructStylesheet(dummyStylesheet.rules);
}
function editStylesheetText(data, stylesheet) {
	var pri = newSafari ? null : 'important';
	switch (data.key) {
		case 'bodyFont':
			stylesheet = editDummyStylesheet('.page', 'font-family', '"' + data.value + '"', pri); 
			break;
		case 'headingFont':
			stylesheet = editDummyStylesheet('h1, h2, h3, h4, h5, h6', 'font-family', '"' + data.value + '"', pri); 
			break;
		case 'textColor':
			stylesheet = editDummyStylesheet('.page', 'color', data.value, null); 
			break;
		case 'bgColor':
			if (newSafari) {
				stylesheet = editDummyStylesheet('#article', 'background-color', data.value, null); 
			} else {
				stylesheet = editDummyStylesheet('#article', 'background-color', data.value, null); 
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
			var selector = newSafari ? '#article' : '.page';
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
	var defaultCssContainerId = 'default-css-' + (newSafari ? '61' : '60');
	var style61 = {
		bodyFont: 'Georgia',
		headingFont: 'Helvetica',
		textColor: '#414141',
		bgColor: '#FBFBFB',
		align: 'start',
		grafs: 'space',
		pageWidth: 800,
		zoomFactor: 1,
	};
	var style60 = {
		bodyFont: 'Georgia',
		headingFont: 'Helvetica',
		textColor: '#000000',
		bgColor: '#f3f2ee',
		align: 'start',
		grafs: 'space',
		pageWidth: 660,
		zoomFactor: 1,
	};
	return {
		suppressExitClick: false,
		showReaderCMItem: false,
		speedScroll: false,
		lastSettingsTabIndex: 0,
		autoread: [],
		css: document.getElementById(defaultCssContainerId).textContent,
		style: newSafari ? style61 : style60,
		printFontSize: 10,
		hotkeys: {
			'activate': {
				which: 82,
				keyCode: 82,
				keyIdentifier: "U+0052",
				altKey: false,
				ctrlKey: false,
				metaKey: false,
				shiftKey: true
			},
			'customize': {
				which: 82,
				keyCode: 82,
				keyIdentifier: "U+0052",
				altKey: false,
				ctrlKey: true,
				metaKey: false,
				shiftKey: false
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
	var css = '\n\n\
        /* added by CustomReader */\n\
        \n\
        @media print {\n\
            p {\n\
                font-size: $pfspt;\n\
                line-height: 1.5;\n\
            }\n\
        }\n\
        .page {\n\
            padding-left: 1cm; padding-right: 1cm;\n\
            font-family: "$bf" !important;\n\
        }\n\
        .page.rtl {\n\
        	direction: rtl;\n\
        }\n\
        h1, h2, h3, h4, h5, h6 {\n\
            font-family: "$hf" !important;\n\
        }\n\
        p {\n\
            margin-top:    $pmt;\n\
            margin-bottom: $pmb;\n\
            text-indent:   $pti;\n\
            text-align:    $pta;\n\
        }\n\
        div.auxiliary {\n\
        	font-size: 0.75em;\n\
        	line-height: 1.4em;\n\
        }\n\
        .float.left {\n\
        	float: left;\n\
        	margin-right: 20px;\n\
        }\n\
        .float.right {\n\
        	float: right;\n\
        	margin-left: 20px;\n\
        }\n';
	if (se.settings.style.grafs == "space")
		var pmt = '1em', pmb = '1em', pti = '0';
	else
		var pmt = '0', pmb = '0', pti = '2em';
	return css
		.replace('$bf',  se.settings.style.bodyFont)
		.replace('$hf',  se.settings.style.headingFont)
		.replace('$pta', se.settings.style.align)
		.replace('$pfs', se.settings.printFontSize)
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
	console.log('cm evt target:', event.target);
	if (event.userInfo == 'reader') {
		event.contextMenu.appendContextMenuItem('openSettings', 'CustomReader Settings');
	}
}
function handleMessage(event) {
	console.log('Message "' + event.name + '" received from:', event.target, event.message);
	switch (event.name) {
		case 'forwardKeydownEvent':
			event.target.reader.dispatchMessage('handleKeydownEvent', event.message);
			break;
		case 'forwardPreview':
			event.target.dispatchMessage('preview', event.message);
			break;
		case 'forwardRevert':
			event.target.dispatchMessage('revert', event.message);
			break;
		case 'hotkeyWasPressed':
			if (event.message === 'activate')
				toggleReader();
			else if (event.message === 'customize')
				openSettingsPanel(event.target);
			break;
		case 'openSettingsBox':
			openSettingsPanel(event.target);
			break;
		case 'passAllSettings':
			event.target.dispatchMessage('receiveAllSettings', JSON.stringify(se.settings));
			break;
		case 'passMarkup':
			event.target.dispatchMessage('receiveMarkup', {
				key   : event.message,
				value : localStorage[event.message]
			});
			break;
		case 'passPrintStyles':
			event.target.dispatchMessage('receivePrintStyles', getPrintRules());
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
			var relevantProperties = ['hotkeys','scrollThrottle','suppressExitClick'];
			for (var i = 0; i < relevantProperties.length; i++)
				settings[relevantProperties[i]] = se.settings[relevantProperties[i]];
			event.target.dispatchMessage('receiveSettings', JSON.stringify(settings));
			break;
		case 'passSetting':
			event.target.page.dispatchMessage('receiveSetting', {
				key   : event.message,
				value : se.settings[event.message]
			});
			break;
		case 'removeSettingsBox':
			event.target.dispatchMessage('removeSettingsBox');
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
				console.log('restoring default style settings');
				se.settings.style = defaults.style;
				event.target.dispatchMessage('receiveStyleSettings', JSON.stringify(se.settings.style));
			}
			event.target.dispatchMessage('receiveMarkup', {
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
		case 'saveSettingAndPassToReaders':
			se.settings[event.message.key] = event.message.value;
			passSettingToAllReaders(event.message.key);
			break;
		case 'saveSettingsBoxPosition':
			console.log(event.message.x, event.message.y);
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
	console.log('Will pass settings.' + key + ' with value:', message.value);
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
	console.log('Will pass settings.' + key + ' with value:', message.value);
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
			if (newSafari) {
				se.settings.style = defaults.style;
				localStorage.css = defaults.css;
				delete se.settings.css;
			} else {
				se.settings.installedPre61 = true;
			}
		}
		if (lastVersion < 11) {
			se.settings.scrollThrottle = 300;
			delete se.settings.speedScroll;
		}
		if (lastVersion < 16) {
			se.settings.showReaderCMItem = !se.settings.hideReaderCMItem;
			delete se.settings.hideReaderCMItem;
		}
	}
	if (newSafari && se.settings.installedPre61) {
		se.settings.style = defaults.style;
		localStorage.css = defaults.css;
		delete se.settings.css;
		delete se.settings.installedPre61;
	}
	se.settings.lastVersion = 16;
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
