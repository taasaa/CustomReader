var safariVersion = /AppleWebKit\/(\d+)\./.exec(navigator.appVersion)[1] * 1;
var newSafari = (safariVersion >= 537);
var scrollElement = newSafari ? document.body : document.querySelector('div#article');

window.longScrollTime = 200;
window.shortScrollTime = 100;

document.addEventListener('keydown', scrollSmoothly, true);
document.addEventListener('setscrollspeed', function (e) {
	console.log('Received setscrollspeed event:', e, e.detail);
	window.longScrollTime = e.detail.longScrollTime;
	window.shortScrollTime = e.detail.shortScrollTime;
}, false);

function scrollSmoothly(e) {
	if (e.metaKey || e.altKey || e.ctrlKey || (e.shiftKey && e.which !== 32))
		return;
	var longScrollLength = scrollElement.clientHeight;
	switch (e.which) {
		case 32: 	// space
			e.preventDefault(); e.stopPropagation();
			smoothScroll(scrollElement, (longScrollLength * (e.shiftKey ? -1 : 1)), longScrollTime); break;
		case 33: 	// pg up
			e.preventDefault(); e.stopPropagation();
			smoothScroll(scrollElement, (-1 * longScrollLength), longScrollTime); break;
		case 34: 	// pg dn
			e.preventDefault(); e.stopPropagation();
			smoothScroll(scrollElement, longScrollLength, longScrollTime); break;
		case 35: 	// end
			break;
		case 36: 	// home
			break;
		case 38: 	// up
			e.preventDefault(); e.stopPropagation();
			smoothScroll(scrollElement, (-1 * 50), shortScrollTime); break;
		case 40: 	// down
			e.preventDefault(); e.stopPropagation();
			smoothScroll(scrollElement, 50, shortScrollTime); break;
		default: break;
	}
}
