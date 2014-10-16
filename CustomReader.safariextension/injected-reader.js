function SettingsBox() {
	var sb = document.createElement('div');
	sb.id = 'CustomReaderSettingsBox';
	sb.setAttribute('style', '\
		position: fixed;\
		top: 24px;\
		right: 24px;\
		z-index: 99999;\
		width: 480px;\
		height: 522px;\
		box-shadow: 0 2px 16px rgba(0,0,0,0.6);\
		border: none;\
		border-top-left-radius: 5px;\
		border-top-right-radius: 5px;\
	');
	sb.titlebar = (function () {
		var tb = document.createElement('header');
		tb.id = 'CustomReaderTitleBar';
		tb.setAttribute('style', '\
			z-index: 1;\
			width: 100%;\
			height: 22px;\
			border-top-left-radius: 5px;\
			border-top-right-radius: 5px;\
			text-align: center;\
			font: bold 12px/0 "Lucida Grande", "Segoe UI", sans-serif;\
			color: rgba(0,0,0,0.6);\
			text-shadow: 0 1px rgba(255,255,255,0.7);\
			cursor: default;\
		');
		tb.style.background = 'url("' + safari.extension.baseURI + 'titlebar.png") no-repeat';
		tb.innerHTML = '<span style="position:relative; top:10px">CustomReader Settings</span>';
		return tb;
	})();
	sb.iframe = (function () {
		var sf = document.createElement('iframe');
		sf.name = 'CustomReaderSettingsWin';
		sf.setAttribute('style', '\
			display: block;\
			position: absolute;\
			top: 22px;\
			z-index: -1;\
			width: 100%;\
			height: 500px;\
			border: none;\
		');
		sf.src = safari.extension.baseURI + 'settings.html';
		return sf;
	})();
	sb.insert = function () {
		document.documentElement.appendChild(this);
	};
	sb.remove = function () {
		document.documentElement.removeChild(this);
	};
	sb.move = function (e) {
		sb.style.left = (e.clientX - sb.clickX) + 'px';
		sb.style.top  = (e.clientY - sb.clickY) + 'px';
	};
	sb.stopMove = function (e) {
		if (e.button !== 0) return;
		document.removeEventListener('mousemove', sb.move, false);
		sb.titlebar.removeEventListener('mouseup', sb.stopMove, false);
		sb.titlebar.style.height = '22px';
		safari.self.tab.dispatchMessage('saveSettingsBoxPosition', {
			x: sb.offsetLeft,
			y: sb.offsetTop
		});
	};
	sb.titlebar.onmousedown = function (e) {
		if (e.button !== 0) return;
		sb.titlebar.style.height = '480px';
		sb.clickX = e.offsetX;
		sb.clickY = e.offsetY;
		document.addEventListener('mousemove', sb.move, false);
		sb.titlebar.addEventListener('mouseup', sb.stopMove, false);
		return false;
	};
	sb.titlebar.onclick = function (e) {
		e.preventDefault();
		e.stopPropagation();
	};
	sb.adjustPosition = function (position) {
		if (position && (position.x <= window.innerWidth - this.offsetWidth) 
		             && (position.y <= window.innerHeight - this.offsetHeight)) {
			this.style.left = position.x + 'px';
			this.style.top  = position.y + 'px';
		} else
			this.style.top = (window.innerHeight/2 - this.offsetHeight/2) + 'px';
	};
	sb.appendChild(sb.titlebar);
	sb.appendChild(sb.iframe);
	return sb;
}
function addSettingsButton() {
	var settingsButton = document.createElement('button');
	settingsButton.title = 'Customize Reader';
	settingsButton.onclick = function (e) {
		safari.self.tab.dispatchMessage('openSettingsBox');
	};
	if (newSafari) {
		settingsButton.style.background = 'url(' + safari.extension.baseURI + 'gear@2x.png) no-repeat center/16px';
		settingsButton.style.opacity = '0.7';
		var controls = document.querySelector('#controls');
		var separator = document.createElement('div');
		separator.className = 'separator';
		controls.appendChild(separator);
		controls.appendChild(settingsButton);
		[].slice.call(controls.querySelectorAll('button')).forEach(function (button) {
			button.style.cursor = 'pointer';
		});
	} else {
		settingsButton.style.background = 'url(' + safari.extension.baseURI + 'settings.png)';
		settingsButton.onmousedown = function (e) {
			e.currentTarget.style.background = 'url(' + safari.extension.baseURI + 'settings-active.png)';
		};
		settingsButton.onmouseup = function (e) {
			e.currentTarget.style.background = 'url(' + safari.extension.baseURI + 'settings.png)';
		};
		var hud = document.querySelector('#hud');
		hud.style.width = '362px';
		hud.style.marginLeft = window.getComputedStyle(hud).marginLeft.split('px')[0]*1 - 24 + 'px';
		hud.insertBefore(settingsButton, hud.firstChild);
	}
}
function applyScrollThrottle(val) {
	// console.log('Applying scroll throttle:', val);
	var longScrollTime = Math.max((500 - val), 1);
	var ce = new CustomEvent('setscrollspeed', {
		detail: {
			longScrollTime  : longScrollTime,
			shortScrollTime : Math.max((longScrollTime / 2), 1)
		}
	});
	document.dispatchEvent(ce);
}
function applySuppressExitClick(value) {
	var docEl = document.documentElement;
	if (value == true) {
		docEl.setAttribute('notonclick', docEl.getAttribute('onclick'));
		docEl.removeAttribute('onclick');
	} else {
		var notOnClick = docEl.getAttribute('notonclick');
		if (notOnClick) {
			docEl.setAttribute('onclick', notOnClick);
			docEl.removeAttribute('notonclick');
		}
	}
}
function handleContextMenu(e) {
	safari.self.tab.setContextMenuEventUserInfo(e, 'reader');
}
function handleHotkeyActivate(e) {
	var props = ['which','altKey','ctrlKey','metaKey','shiftKey'];
	var match = props.every(function (prop) {
		return e[prop] === settings.hotkeys['activate'][prop];
	});
	if (match) {
		e.preventDefault(); e.stopPropagation();
		safari.self.tab.dispatchMessage('hotkeyWasPressed', 'activate');
	}
}
function handleHotkeyCustomize(e) {
	var props = ['which','altKey','ctrlKey','metaKey','shiftKey'];
	var match = props.every(function (prop) {
		return e[prop] === settings.hotkeys['customize'][prop];
	});
	if (match) {
		e.preventDefault(); e.stopPropagation();
		safari.self.tab.dispatchMessage('hotkeyWasPressed', 'customize');
	}	
}
function handleMousedown(e) {
	if (e.button !== 0) return;
	if (document.settingsBox) {
		if (e.target.parentElement === document.settingsBox) return false;
		if (e.target.parentElement.parentElement === document.settingsBox) return false;
		if (e.target === document.settingsBox) return false;
		if (e.button === 0) removeSettingsBox();
	} else
	if (document.overlay) {
		e.stopPropagation();
		document.overlay.remove();
	} else {
		if (e.target instanceof HTMLAnchorElement) {
			if (e.target.href.split('#')[0] !== document.baseURI)
				e.target.target = '_blank';
		} else
		if (e.target instanceof HTMLImageElement) {
			// e.stopPropagation();
			// showWholeImage(e.target);
		}
	}
}
function handleMessage(e) {
	switch (e.name) {
		case 'youAreNowActive':
			window.readerActivated = true;
			// if (!window.imagesProcessed) 
			// 	processImages(true);
			break;
		case 'handleKeydownEvent':
			var e = e.message;
			e.preventDefault = function () {};
			e.stopPropagation = function () {};
			scrollSmoothly(e);
			break;
		case 'insertSettingsBox':
			if (document.settingsBox)
				removeSettingsBox();
			else
				insertSettingsBox(e.message);
			break;
		case 'preview':
			if (e.message.key === 'css') {
				if (document.myStyleTag) {
					replaceCSS(document.myStyleTag, e.message.value);
				}
			} break;
		case 'receiveMarkup':
			if (e.message.key === 'css') {
				if (document.myStyleTag) {
					settings.css = e.message.value;
					replaceCSS(document.myStyleTag, settings.css);
				}
			} break;
		case 'receivePrintStyles':
			var sac = document.querySelector('style#article-content'), stc = sac.textContent;
			sac.textContent = stc.slice(0, stc.search(/\s*\/\* added by CustomReader \*\//)) + e.message;
			break;
		case 'receiveSetting':
			console.log('received key:', e.message.key, '; value:', e.message.value);
			settings[e.message.key] = e.message.value;
			if (e.message.key == 'scrollThrottle') {
				applyScrollThrottle(e.message.value);
			} else
			if (e.message.key == 'suppressExitClick') {
				applySuppressExitClick(e.message.value);
			}
			break;
		case 'receiveSettings':
			var receivedSettings = JSON.parse(e.message);
			for (var key in receivedSettings) {
				settings[key] = receivedSettings[key];
				if (key == 'suppressExitClick') {
					applySuppressExitClick(receivedSettings[key]);
				}
				if (key == 'scrollThrottle') {
					applyScrollThrottle(receivedSettings[key]);
				}
			}
			// if (!window.imagesProcessed)
			// 	processImages(true);
			break;
		case 'removeSettingsBox':
			removeSettingsBox();
			break;
		case 'revert':
			if (e.message.key === 'css') {
				if (document.myStyleTag) {
					replaceCSS(document.myStyleTag, settings.css);
				}
			} break;
		default: ;
	}
}
function insertScript() {
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = safari.extension.baseURI + 'scroller.js';
	document.head.appendChild(script);
}
function insertStyleTag(css) {
	document.myStyleTag = document.head.querySelector('#CustomReaderStyles');
	if (document.myStyleTag)
		document.head.removeChild(document.myStyleTag);
	document.myStyleTag = document.createElement('style');
	document.myStyleTag.id = 'CustomReaderStyles';
	document.myStyleTag.type = 'text/css';
	document.myStyleTag.textContent = css;
	document.head.appendChild(document.myStyleTag);
}
function insertSettingsBox(position) {
	if (!document.settingsBox) {
		document.settingsBox = new SettingsBox();
		document.settingsBox.insert();
		document.settingsBox.adjustPosition(position);
	}
}
function onResize() {
	var article = document.querySelector('#article');
	article.style.maxWidth = window.innerWidth - 44 + 'px';
	article.style.paddingBottom = window.innerHeight + 'px';
}
function processImages(firstTime) {
	if (settings.printImagesReduce) {
		var images = [].slice.call(document.querySelectorAll('img'));
		images.forEach(function (img) {
			if (!/reader-image-tiny/.test(img.className)) {
				img.className = (img.className + ' float right').trim();
			}/*
			var parent = img.parentElement;
			if (parent.className == 'page') {
				if (!/reader-image-tiny/.test(img.className)) {
					img.className = (img.className + ' image-float').trim();
				}
			} else {
				while (parent.parentElement.className != 'page' || parent == document.body) {
					parent = parent.parentElement;
				}
				if (parent != document.body) {
					parent.className = (parent.className + ' image-float').trim();
				}
			}*/
		});
		window.imagesProcessed = true;
		if (firstTime) {
			setTimeout(processImages, 20000);
			setTimeout(processImages, 60000);
		}
	}
}
function removeSettingsBox() {
	if (document.settingsBox) {
		document.settingsBox.remove();
		document.settingsBox = null;
	}
}
function replaceCSS(styleTag, css) {
	styleTag.textContent = css;
}
function showWholeImage(img) {
	var img2 = img.cloneNode();
	img2.style.maxWidth = window.innerWidth + 'px';
	img2.style.maxHeight = window.innerHeight + 'px';
	img2.style.border = '3px solid whitesmoke';
	img2.style.outline = '1px solid black';
	document.overlay = document.createElement('div');
	document.overlay.id = 'CustomReaderOverlay';
	var overlayStyle = 
		'display            : -webkit-box;'        +
		'-webkit-box-pack   : center;'             +
		'-webkit-box-align  : center;'             +
		'width              : 100%; height: 100%;' +
		'position           : fixed;'              +
		'top                : 0; left: 0;'         +
		'z-index            : 20;'                 +
		'background-color   : rgba(0,0,0,0);'      +
		'-webkit-transition : background-color 0.1s linear;';
	document.overlay.setAttribute('style', overlayStyle);
	document.overlay.remove = function () {
		document.body.removeChild(document.overlay);
		document.overlay = null;
	};
	document.overlay.appendChild(img2);
	document.body.appendChild(document.overlay);
	setTimeout(function () {
		document.overlay.style.backgroundColor = 'rgba(0,0,0,0.75)';
	}, 1);
}
function initialize() {
	window.safariVersion = /AppleWebKit\/(\d+)\./.exec(navigator.appVersion)[1] * 1;
	window.newSafari = (safariVersion >= 537);
	window.settings = { css: '' };
	window.readerActivated = false;
	window.imagesProcessed = false;
	window.addEventListener('load', function () {
		safari.self.tab.dispatchMessage('passReaderSettings');
		safari.self.tab.dispatchMessage('passMarkup', 'css');
		safari.self.tab.dispatchMessage('passPrintStyles');
		document.querySelector('.page').style.fontFamily = '';
	}, false);
	if (newSafari) {
		window.addEventListener('resize', onResize, false);
	}
	document.addEventListener('keydown', handleHotkeyActivate, false);
	document.addEventListener('keydown', handleHotkeyCustomize, false);
	document.addEventListener('mousedown', handleMousedown, false);
	document.addEventListener('contextmenu', handleContextMenu, false);
	safari.self.addEventListener('message', handleMessage, false);
	insertScript();
	insertStyleTag('');
	addSettingsButton();
}

initialize();
