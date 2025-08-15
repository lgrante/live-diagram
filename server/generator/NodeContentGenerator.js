"use strict";

const { CONFIG } = require('../config');

/**
 * NodeContentGenerator
 * Generates the foreignObject HTML for node content depending on the element
 * configuration (content_list, html_content, tableau...).
 */
class NodeContentGenerator {
  /**
   * @param {object} themeColors
   * @param {import('./ModalManager').ModalManager} modalManager
   */
  constructor(themeColors, modalManager) {
    this.themeColors = themeColors;
    this.modalManager = modalManager;
  }

  /**
   * Entry point to generate content for a node.
   * @param {object} element
   * @returns {{svg: string, width: number, height: number}}
   */
  generateContent(element) {
    if (element.type === 'tableau') return this.generateTableNode(element);
    if (element.content_list) return this.generateFromContentList(element);
    if (element.html_content) return this.generateFromHTML(element);
    return this.generateDefaultContent();
  }

  /** Generate content from a structured content_list. */
  generateFromContentList(element) {
    const width = element.width || 400;
    const height = element.height || 300;
    const type = element.type || 'default';
    const nodeBgColor = this.themeColors[type] || this.themeColors.default;
    let html = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${CONFIG.fontFamily};color:${this.themeColors.text};height:100%;width:100%;box-sizing:border-box;display:flex;flex-direction:column;">`;
    html += this.generateHeader(element, nodeBgColor);
    html += this.generateContentArea(element);
    html += '</div>';
    const svgContent = `<foreignObject width="${width}" height="${height}">${html}</foreignObject>`;
    return { svg: svgContent, width, height };
  }

  /** Header with title/subtitle. */
  generateHeader(element, nodeBgColor) {
    if (!element.title && !element.subtitle) return '';
    let headerHtml = `<div style="flex-shrink:0;padding:${CONFIG.padding}px ${CONFIG.padding}px 10px ${CONFIG.padding}px;background-color:${nodeBgColor};position:relative;z-index:1;">`;
    if (element.title) {
      headerHtml += `<h2 style="display:flex;align-items:center;gap:8px;justify-content:center;margin:0 0 ${element.subtitle ? '5px' : '0'} 0;font-size:20px;color:${this.themeColors.text};">${element.title}</h2>`;
    }
    if (element.subtitle) headerHtml += `<p style="text-align:center;margin:0;font-size:14px;color:${this.themeColors.textFaded};">${element.subtitle}</p>`;
    headerHtml += '</div>';
    return headerHtml;
  }

  /** Scrollable area for content sections. */
  generateContentArea(element) {
    let contentHtml = `<div style="flex-grow:1;overflow-y:auto;padding:10px ${CONFIG.padding}px ${CONFIG.padding}px ${CONFIG.padding}px;">`;
    if (element.content_list) {
      element.content_list.forEach((item, sectionIndex) => {
        if (item.label && item.values && Array.isArray(item.values)) {
          contentHtml += this.generateSection(item, sectionIndex, element.id);
        }
      });
    }
    contentHtml += '</div>';
    return contentHtml;
  }

  /** One section (title + list) */
  generateSection(section, sectionIndex, elementId) {
    let html = `<div style="margin-top:15px;"><h3 style="font-size:16px;margin:0 0 8px 0;padding-bottom:5px;border-bottom:1px solid ${this.themeColors.border};font-weight:600;text-align:left;display:flex;align-items:center;"><span>${section.label}</span></h3><ul style="margin:0;padding:0;list-style:none;">`;
    (section.values || []).forEach((valueItem, valueIndex) => {
      html += this.generateListItem(valueItem, sectionIndex, valueIndex, elementId);
    });
    html += '</ul></div>';
    return html;
  }

  /** List item HTML generator */
  generateListItem(valueItem, sectionIndex, valueIndex, elementId) {
    const id = `${elementId}-${sectionIndex}-${valueIndex}`;
    const subtitleHtml = valueItem.subtitle ? `<p style="font-size:12px;color:${this.themeColors.textFaded};margin:2px 0 0 0;text-align:left;">${valueItem.subtitle}</p>` : '';
    const { eventHandlers, isInteractive } = this.generateEventHandlers(valueItem, id);
    return `<li style="display:flex;align-items:flex-start;margin:2px -8px;padding:8px;border-radius:6px;transition:background-color .2s;${isInteractive ? 'cursor:pointer;' : ''}" ${eventHandlers}><div style="margin-left:0;"><span>${valueItem.label}</span>${subtitleHtml}</div></li>`;
  }

  /** Hover/click handlers for list items. */
  generateEventHandlers(valueItem, id) {
    let handlers = { onmouseover: `this.style.backgroundColor='${this.themeColors.hover}'`, onmouseout: `this.style.backgroundColor='transparent'` };
    let isInteractive = !!valueItem.url || !!valueItem.modal;
    const modalId = valueItem.modal ? `'modal-${id}'` : 'null';
    const url = valueItem.url ? `'${valueItem.url}'` : 'null';
    if (valueItem.modal) {
      this.modalManager.addModal(`modal-${id}`, valueItem.modal);
      if (valueItem.modal.on === 'hover') {
        handlers.onmouseenter = `showModal(event, ${modalId})`;
        handlers.onmouseleave = `hideModal(${modalId})`;
      }
    }
    if (valueItem.url || (valueItem.modal && valueItem.modal.on === 'click')) {
      handlers.onclick = `handleItemClick(event, ${url}, ${valueItem.modal && valueItem.modal.on === 'click' ? modalId : 'null'})`;
    }
    return { eventHandlers: Object.entries(handlers).map(([k, v]) => `${k}="${v}"`).join(' '), isInteractive };
  }

  /** Raw HTML content */
  generateFromHTML(element) {
    const width = element.width || 200;
    const height = element.height || 100;
    const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${CONFIG.fontFamily};color:${this.themeColors.text};height:100%;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;"><div>${element.html_content}</div></div>`;
    return { svg: `<foreignObject width="${width}" height="${height}">${html}</foreignObject>`, width, height };
  }

  /** Default fallback */
  generateDefaultContent() { return { svg: `<text x="10" y="20">No content</text>`, width: 200, height: 100 }; }

  /** Simple table-like node */
  generateTableNode(element) {
    const width = element.width || 500;
    const height = element.height || 260;
    const type = 'tableau';
    const nodeBgColor = this.themeColors[type] || this.themeColors.default;
    const border = this.themeColors.border;
    const text = this.themeColors.text;
    const textFaded = this.themeColors.textFaded;

    const columns = Array.isArray(element.columns) ? element.columns : [];
    const rows = Array.isArray(element.rows) ? element.rows : [];
    const colCount = Math.max(1, columns.length || (rows[0] ? rows[0].length : 1));
    const cellPadding = 8;
    const tablePadding = 10;
    const innerWidth = width - (tablePadding * 2);
    const colWidth = Math.floor(innerWidth / colCount);
    const headerHeight = element.title ? 40 : 0;
    const innerHeight = height - headerHeight - tablePadding * 2;
    const rowHeight = 28;
    const headerRowHeight = colCount > 0 ? 30 : 0;
    const maxVisibleRows = Math.floor((innerHeight - headerRowHeight) / rowHeight);
    const visibleRows = rows.slice(0, Math.max(0, maxVisibleRows));

    let html = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${CONFIG.fontFamily};color:${text};height:100%;width:100%;box-sizing:border-box;display:flex;flex-direction:column;background:${nodeBgColor};">`;
    if (element.title) {
      html += `<div style=\"flex-shrink:0;padding:${CONFIG.padding}px ${CONFIG.padding}px 8px ${CONFIG.padding}px;background-color:${nodeBgColor};border-bottom:1px solid ${border};\"><h2 style=\"margin:0;font-size:18px;color:${text};text-align:center;\">${element.title}</h2>${element.subtitle ? `<p style=\"margin:4px 0 0 0;font-size:13px;color:${textFaded};text-align:center;\">${element.subtitle}</p>` : ''}</div>`;
    }
    html += `<div style="flex-grow:1;overflow:auto;padding:${tablePadding}px;">`;
    html += `<div style="border:1px solid ${border};border-radius:6px;overflow:hidden;">`;
    if (colCount > 0) {
      html += `<div style="display:flex;background:${this.themeColors.background};border-bottom:1px solid ${border};">`;
      for (let c = 0; c < colCount; c++) {
        const label = columns[c] !== undefined ? String(columns[c]) : `Col ${c+1}`;
        html += `<div style="width:${colWidth}px;box-sizing:border-box;padding:${cellPadding}px;font-weight:600;color:${text};border-right:${c < colCount-1 ? `1px solid ${border}` : 'none'};">${label}</div>`;
      }
      html += `</div>`;
    }
    visibleRows.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? 'transparent' : this.themeColors.clusterBg;
      html += `<div style="display:flex;background:${bg};border-bottom:${idx < visibleRows.length-1 ? `1px solid ${border}` : 'none'};">`;
      for (let c = 0; c < colCount; c++) {
        const value = row && row[c] !== undefined ? String(row[c]) : '';
        html += `<div style="width:${colWidth}px;box-sizing:border-box;padding:${cellPadding}px;color:${text};border-right:${c < colCount-1 ? `1px solid ${border}` : 'none'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</div>`;
      }
      html += `</div>`;
    });
    if (rows.length > visibleRows.length) {
      const remaining = rows.length - visibleRows.length;
      html += `<div style="padding:${cellPadding}px;color:${textFaded};font-size:12px;border-top:1px dashed ${border};text-align:right;">+ ${remaining} lignes supplémentaires…</div>`;
    }
    html += `</div></div></div>`;
    const svgContent = `<foreignObject width="${width}" height="${height}">${html}</foreignObject>`;
    return { svg: svgContent, width, height };
  }
}

module.exports = { NodeContentGenerator };


