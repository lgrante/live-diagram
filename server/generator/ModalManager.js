"use strict";

/**
 * ModalManager
 * In-memory registry for small interactive modals attached to list items
 * inside SVG nodes. Provides CSS/JS code injection to enable basic UX.
 */
class ModalManager {
  constructor() {
    /** @type {Map<string, any>} */
    this.modals = new Map();
  }

  /**
   * Register a modal description for a given id.
   * @param {string} id - Unique modal identifier inside the page
   * @param {{title?: string, subtitle?: string, html_content?: string}} modalData
   */
  addModal(id, modalData) { this.modals.set(id, modalData); }

  /**
   * Render all registered modals as HTML, to be injected in the final SVG.
   * @param {object} themeColors - Theme palette to style the modal
   * @returns {string}
   */
  generateModalsHTML(themeColors) {
    let html = '';
    for (const [id, modal] of this.modals) {
      html += `<div id="${id}" class="modal"><div class="modal-header"><h4>${modal.title || ''}</h4>${modal.subtitle ? `<p>${modal.subtitle}</p>` : ''}</div><div class="modal-content">${modal.html_content || ''}</div></div>`;
    }
    return html;
  }

  /**
   * CSS for modals, using current theme.
   * @param {object} themeColors
   * @returns {string}
   */
  generateModalCSS(themeColors) {
    return `.modal{position:fixed;visibility:hidden;opacity:0;transition:opacity .2s ease-in-out,visibility .2s;background-color:${themeColors.modalBg};border:1px solid ${themeColors.border};border-radius:8px;box-shadow:0 4px 12px ${themeColors.modalShadow};padding:16px;z-index:100;max-width:350px;pointer-events:none}.modal.visible{visibility:visible;opacity:1;pointer-events:auto}.modal-header h4{margin:0 0 5px 0;font-size:16px;color:${themeColors.text}}.modal-header p{margin:0 0 10px 0;font-size:12px;color:${themeColors.textFaded}}.modal-content{font-size:14px;color:${themeColors.text}}`;
  }

  /**
   * Minimal client JS to show/hide modals.
   * @returns {string}
   */
  generateModalJS() {
    return `let activeClickModal=null;function showModal(e,t){const o=document.getElementById(t);if(!o)return;const l=e.target.closest("svg").getBoundingClientRect(),n=e.clientX-l.left+20,i=e.clientY-l.top;o.style.left=n+"px",o.style.top=i+"px",o.classList.add("visible")}function hideModal(e){const t=document.getElementById(e);t&&t.classList.remove("visible")}function toggleModal(e,t){e.stopPropagation(),activeClickModal&&activeClickModal!==t&&hideModal(activeClickModal);const o=document.getElementById(t);o.classList.contains("visible")?(hideModal(t),activeClickModal=null):(showModal(e,t),activeClickModal=t)}function handleItemClick(e,t,o){t?(e.stopPropagation(),window.open(t,"_blank")):o&&toggleModal(e,o)}document.addEventListener("click",function(e){if(activeClickModal){const t=document.getElementById(activeClickModal);t&&!t.contains(e.target)&&(hideModal(activeClickModal),activeClickModal=null)}});`;
  }
}

module.exports = { ModalManager };


