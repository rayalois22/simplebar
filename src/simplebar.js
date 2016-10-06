import scrollbarWidth from 'scrollbarwidth'

import './simplebar.css'

export default class SimpleBar {
    constructor(element, options) {
        this.el = element;
        this.track;
        this.scrollbar;
        this.flashTimeout;
        this.contentEl          = this.el;
        this.scrollContentEl    = this.el;
        this.dragOffset         = { x: 0, y: 0 };
        this.isVisible          = { x: true, y: true };
        this.scrollOffsetAttr   = { x: 'scrollLeft', y: 'scrollTop' };
        this.sizeAttr           = { x: 'offsetWidth', y: 'offsetHeight' };
        this.scrollSizeAttr     = { x: 'scrollWidth', y: 'scrollHeight' };
        this.offsetAttr         = { x: 'left', y: 'top' };
        this.observer;
        this.currentAxis;

        const DEFAULT_OPTIONS = {
            wrapContent: true,
            autoHide: true,
            classNames: {
                container: 'simplebar',
                content: 'simplebar-content',
                scrollContent: 'simplebar-scroll-content',
                scrollbar: 'simplebar-scrollbar',
                track: 'simplebar-track'
            }
        }

        this.options = Object.assign({}, DEFAULT_OPTIONS, options);
        this.classNames = this.options.classNames;

        this.flashScrollbar = this.flashScrollbar.bind(this);
        this.startScroll = this.startScroll.bind(this);
        this.startDrag = this.startDrag.bind(this);
        this.drag = this.drag.bind(this);
        this.endDrag = this.endDrag.bind(this);

        this.init();
    }

    init() {
        // Save a reference to the instance, so we know this DOM node has already been instancied
        this.el.SimpleBar = this;

        // If scrollbar is a floating scrollbar, disable the plugin
        if (scrollbarWidth() === 0) {
            this.el.style.overflow = 'auto';

            return
        }

        // Prepare DOM
        if (this.options.wrapContent) {
            const wrapperScrollContent = document.createElement('div');
            const wrapperContent = document.createElement('div');
            
            wrapperScrollContent.classList.add(this.classNames.scrollContent);
            wrapperContent.classList.add(this.classNames.content);
            
            while (this.el.firstChild)
                wrapperContent.appendChild(this.el.firstChild)
            
            wrapperScrollContent.appendChild(wrapperContent);
            this.el.appendChild(wrapperScrollContent);
        }

        const track = document.createElement('div');
        const scrollbar = document.createElement('div');

        track.classList.add(this.classNames.track);
        scrollbar.classList.add(this.classNames.scrollbar);

        track.appendChild(scrollbar);

        this.trackX = track.cloneNode(true);
        this.trackX.classList.add('horizontal');

        this.trackY = track.cloneNode(true);
        this.trackY.classList.add('vertical');

        this.el.insertBefore(this.trackX, this.el.firstChild);
        this.el.insertBefore(this.trackY, this.el.firstChild);

        this.scrollbarX = this.trackX.querySelector(`.${this.classNames.scrollbar}`);
        this.scrollbarY = this.trackY.querySelector(`.${this.classNames.scrollbar}`);
        this.scrollContentEl = this.el.querySelector('.' + this.classNames.scrollContent);
        this.contentEl = this.el.querySelector('.' + this.classNames.content);

        // Calculate content size
        this.resizeScrollContent();
        this.resizeScrollbar('x');
        this.resizeScrollbar('y');

        if (!this.options.autoHide) {
            this.showScrollbar('x');
            this.showScrollbar('y');
        }

        // Event listeners
        if (this.options.autoHide) {
            this.el.addEventListener('mouseenter', this.flashScrollbar);
        }

        this.scrollbarX.addEventListener('mousedown', (e) => this.startDrag(e, 'x'));
        this.scrollbarY.addEventListener('mousedown', (e) => this.startDrag(e, 'y'));
        
        this.scrollContentEl.addEventListener('scroll', this.startScroll);

        // MutationObserver is IE11+
        if (typeof MutationObserver !== 'undefined') {
            // create an observer instance
            this.observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.target === this.el || mutation.addedNodes.length) {
                        this.recalculate();
                    }
                });
            });
             
            // pass in the target node, as well as the observer options
            this.observer.observe(this.el, { attributes: true, childList: true, characterData: true, subtree: true });
        }
    }
    
    /**
     * Start scrollbar handle drag
     */
    startDrag(e, axis = 'y') {
        // Preventing the event's default action stops text being
        // selectable during the drag.
        e.preventDefault()
        
        let scrollbar = axis === 'y' ? this.scrollbarY : this.scrollbarX;
        // Measure how far the user's mouse is from the top of the scrollbar drag handle.
        let eventOffset = axis === 'y' ? e.pageY : e.pageX;
        
        this.dragOffset[axis] = eventOffset - scrollbar.getBoundingClientRect()[this.offsetAttr[axis]];
        this.currentAxis = axis;

        document.addEventListener('mousemove', this.drag);
        document.addEventListener('mouseup', this.endDrag);
    }


    /**
     * Drag scrollbar handle
     */
    drag(e) {
        e.preventDefault();

        let eventOffset = this.currentAxis === 'y' ? e.pageY : e.pageX;
        let track = this.currentAxis === 'y' ? this.trackY : this.trackX;

        // Calculate how far the user's mouse is from the top/left of the scrollbar (minus the dragOffset).
        let dragPos = eventOffset - track.getBoundingClientRect()[this.offsetAttr[this.currentAxis]] - this.dragOffset[this.currentAxis];
        
        // Convert the mouse position into a percentage of the scrollbar height/width.
        let dragPerc = dragPos / track[this.sizeAttr[this.currentAxis]];
        
        // Scroll the content by the same percentage.
        let scrollPos = dragPerc * this.contentEl[this.scrollSizeAttr[this.currentAxis]];

        this.scrollContentEl[this.scrollOffsetAttr[this.currentAxis]] = scrollPos;
    }


    /**
     * End scroll handle drag
     */
    endDrag() {
        document.removeEventListener('mousemove', this.drag);
        document.removeEventListener('mouseup', this.endDrag);
    }


    /**
     * Resize scrollbar
     */
    resizeScrollbar(axis = 'y') {
        let track;
        let scrollbar;

        if (axis === 'x') {
            track = this.trackX;
            scrollbar = this.scrollbarX;
        } else { // 'y'
            track = this.trackY;
            scrollbar = this.scrollbarY;
        }

        let contentSize     = this.contentEl[this.scrollSizeAttr[axis]],
            scrollOffset    = this.scrollContentEl[this.scrollOffsetAttr[axis]], // Either scrollTop() or scrollLeft().
            scrollbarSize   = track[this.sizeAttr[axis]],
            scrollbarRatio  = scrollbarSize / contentSize,
            // Calculate new height/position of drag handle.
            // Offset of 2px allows for a small top/bottom or left/right margin around handle.
            handleOffset    = Math.round(scrollbarRatio * scrollOffset) + 2,
            handleSize      = Math.floor(scrollbarRatio * (scrollbarSize - 2)) - 2;

        // Set isVisible to false if scrollbar is not necessary (content is shorter than wrapper)
        this.isVisible[axis] = scrollbarSize < contentSize

        if (this.isVisible[axis]) {
            track.style.visibility = 'visible';

            if (axis === 'x') {
                scrollbar.style.left = `${handleOffset}px`;
                scrollbar.style.width = `${handleSize}px`;
            } else {
                scrollbar.style.top = `${handleOffset}px`;
                scrollbar.style.height = `${handleSize}px`;
            } 
        } else {
            track.style.visibility = 'hidden';
        }
    }


    /**
     * Resize content element
     */
    resizeScrollContent() {
        const _scrollbarWidth = scrollbarWidth()

        this.scrollContentEl.style.width = `${this.el.offsetWidth + _scrollbarWidth}px`;
        this.scrollContentEl.style.height = `${this.el.offsetHeight + _scrollbarWidth}px`;
    }


    /**
     * On scroll event handling
     */
    startScroll() {
        this.flashScrollbar();
    }


    /**
     * Flash scrollbar visibility
     */
    flashScrollbar() {
        this.resizeScrollbar('x');
        this.resizeScrollbar('y');
        this.showScrollbar('x');
        this.showScrollbar('y');
    }


    /**
     * Show scrollbar
     */
    showScrollbar(axis = 'y') {
        if (!this.isVisible[axis]) {
            return
        }

        if (axis === 'x') {
            this.scrollbarX.classList.add('visible');
        } else {
            this.scrollbarY.classList.add('visible');
        }

        if (!this.options.autoHide) {
            return
        }
        if(typeof this.flashTimeout === 'number') {
            window.clearTimeout(this.flashTimeout);
        }

        this.flashTimeout = window.setTimeout(this.hideScrollbar.bind(this), 1000);
    }


    /**
     * Hide Scrollbar
     */
    hideScrollbar() {
        this.scrollbarX.classList.remove('visible');
        this.scrollbarY.classList.remove('visible');
        
        if(typeof this.flashTimeout === 'number') {
            window.clearTimeout(this.flashTimeout);
        }
    }


    /**
     * Recalculate scrollbar
     */
    recalculate() {
        this.resizeScrollContent();
        this.resizeScrollbar();
    }


    /**
     * Getter for original scrolling element
     */
    getScrollElement() {
        return this.scrollContentEl;
    }


    /**
     * Getter for content element
     */
    getContentElement() {
        return this.contentEl;
    }

    /**
     * UnMount mutation observer and delete SimpleBar instance from DOM element
     */
    unMount() { 
        this.observer && this.observer.disconnect();
        this.el.SimpleBar = null;
        delete this.el.SimpleBar;
    }
}

/**
 * HTML API
 */

// Helper function to retrieve options from element attributes
const getElOptions = function(el) {
    const attributes = [{ autoHide: 'data-simplebar-autohide' }];
    const options = attributes.reduce((acc, obj) => {
        let attribute = obj[Object.keys(obj)[0]];
        acc[Object.keys(obj)[0]] = el.hasAttribute(attribute) ? el.getAttribute(attribute) === 'false' ? false : true : true;
        return acc;
    }, {})

    return options;
}

// MutationObserver is IE11+
if (typeof MutationObserver !== 'undefined') {
    // Mutation observer to observe dynamically added elements
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            Array.from(mutation.addedNodes).forEach(addedNode => {
                if (addedNode.nodeType === 1 && 
                    addedNode.hasAttribute('data-simplebar') &&
                    typeof addedNode.SimpleBar === 'undefined') {
                    new SimpleBar(addedNode, getElOptions(addedNode));
                }
            })

            Array.from(mutation.removedNodes).forEach(removedNode => {
                if (removedNode.nodeType === 1 && 
                    removedNode.hasAttribute('data-simplebar') &&
                    removedNode.SimpleBar) {
                    removedNode.SimpleBar.unMount();
                }
            })
        });
    });

    observer.observe(document, { childList: true, subtree: true });
}

// Instantiate elements already present on the page
document.addEventListener('DOMContentLoaded', () => {
    Array.from(document.querySelectorAll('[data-simplebar]')).forEach(el => {
        new SimpleBar(el, getElOptions(el));
    });
});