#!/usr/bin/env node

/**
 * =============================================================================
 * SERVEUR DE DIAGRAMMES SVG INTERACTIFS
 * =============================================================================
 * Ce script génère des diagrammes SVG dynamiques et interactifs à partir de
 * fichiers de description YAML. Il est conçu pour être extensible et
 * personnalisable.
 *
 * Fonctionnalités Clés :
 * - Thèmes visuels (light/dark)
 * - Groupement d'éléments (clusters)
 * - Modales interactives (au survol ou au clic)
 * - Liens URL sur les items
 * - Styles personnalisés pour les relations (couleurs, pointillés)
 *
 * @author Generated with Gemini
 * @version 2.3.0
 */

// =============================================================================
// IMPORTS ET DÉPENDANCES
// =============================================================================

const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const yaml = require('js-yaml');
const dagre = require('dagre');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { spawn } = require('child_process');

// =============================================================================
// CONFIGURATION GLOBALE
// =============================================================================

/**
 * Thèmes visuels disponibles. Chaque thème définit une palette de couleurs
 * complète pour tous les éléments du diagramme.
 */
const THEMES = {
    // Aligné sur les tokens documentés
    light: {
        background: '#ffffff',
        text: '#111827',          // gray-900
        textFaded: '#6b7280',      // gray-500
        border: '#e5e7eb',         // gray-200
        arrow: '#6b7280',          // neutre
        default: '#ffffff',
        person: '#e0f2fe',     // sky-100
        system: '#dcfce7',     // green-100
        database: '#fef9c3',   // yellow-100
        api: '#fae8ff',        // purple-100
        tableau: '#f3f4f6',    // gray-100
        hover: '#eef2f7',
        clusterBg: '#f9fafb',  // gray-50
        modalBg: '#ffffff',
        modalShadow: 'rgba(0,0,0,0.10)'
    },
    // Palette sombre inspirée de GitHub Dark
    dark: {
        background: '#0d1117',
        text: '#e5e7eb',           // near gray-50
        textFaded: '#9ca3af',      // gray-400
        border: '#30363d',
        arrow: '#8b949e',
        default: '#161b22',
        person: '#0b2f53',
        system: '#113227',
        database: '#3b2f0b',
        api: '#2b213a',
        tableau: '#1f242d',
        hover: '#21262d',
        clusterBg: '#161b22',
        modalBg: '#161b22',
        modalShadow: 'rgba(0,0,0,0.45)'
    }
};

/**
 * Configuration générale de l'apparence et du layout.
 */
const CONFIG = {
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    titleFontSize: 16, lineHeight: 1.4, padding: 20, borderRadius: 8,
    layoutDefaults: { rankdir: 'TB', nodesep: 50, ranksep: 70 }
};

/**
 * Bibliothèque d'icônes SVG. Facilement extensible.
 */
const ICONS = {
    new: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
    delete: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    module: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    link: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
    database: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>`,
    api: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h-1a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1"></path><path d="M2 8h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H2"></path><path d="M12 2v20"></path></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
};

// =============================================================================
// CLASSES UTILITAIRES
// =============================================================================

/**
 * Gère la création, le style et la logique des modales interactives.
 */
class ModalManager {
    constructor() { this.modals = new Map(); }

    /**
     * Ajoute une modale à la collection pour une génération ultérieure.
     * @param {string} id - L'identifiant unique de la modale.
     * @param {object} modalData - Les données de la modale (titre, contenu, etc.).
     */
    addModal(id, modalData) { this.modals.set(id, modalData); }

    /**
     * Génère le code HTML pour toutes les modales enregistrées.
     * @param {object} themeColors - La palette de couleurs du thème actuel.
     * @returns {string} Le code HTML des modales.
     */
    generateModalsHTML(themeColors) {
        let html = '';
        for (const [id, modal] of this.modals) {
            html += `<div id="${id}" class="modal"><div class="modal-header"><h4>${modal.title}</h4>${modal.subtitle ? `<p>${modal.subtitle}</p>` : ''}</div><div class="modal-content">${modal.html_content}</div></div>`;
        }
        return html;
    }

    /**
     * Génère le CSS nécessaire pour le style des modales.
     * @param {object} themeColors - La palette de couleurs du thème actuel.
     * @returns {string} Le code CSS des modales.
     */
    generateModalCSS(themeColors) {
        return `.modal{position:fixed;visibility:hidden;opacity:0;transition:opacity .2s ease-in-out,visibility .2s;background-color:${themeColors.modalBg};border:1px solid ${themeColors.border};border-radius:8px;box-shadow:0 4px 12px ${themeColors.modalShadow};padding:16px;z-index:100;max-width:350px;pointer-events:none}.modal.visible{visibility:visible;opacity:1;pointer-events:auto}.modal-header h4{margin:0 0 5px 0;font-size:16px;color:${themeColors.text}}.modal-header p{margin:0 0 10px 0;font-size:12px;color:${themeColors.textFaded}}.modal-content{font-size:14px;color:${themeColors.text}}`;
    }

    /**
     * Génère le code JavaScript pour gérer l'affichage et les interactions des modales.
     * @returns {string} Le code JavaScript client.
     */
    generateModalJS() {
        return `let activeClickModal=null;function showModal(e,t){const o=document.getElementById(t);if(!o)return;const l=e.target.closest("svg").getBoundingClientRect(),n=e.clientX-l.left+20,i=e.clientY-l.top;o.style.left=n+"px",o.style.top=i+"px",o.classList.add("visible")}function hideModal(e){const t=document.getElementById(e);t&&t.classList.remove("visible")}function toggleModal(e,t){e.stopPropagation(),activeClickModal&&activeClickModal!==t&&hideModal(activeClickModal);const o=document.getElementById(t);o.classList.contains("visible")?(hideModal(t),activeClickModal=null):(showModal(e,t),activeClickModal=t)}function handleItemClick(e,t,o){t?(e.stopPropagation(),window.open(t,"_blank")):o&&toggleModal(e,o)}document.addEventListener("click",function(e){if(activeClickModal){const t=document.getElementById(activeClickModal);t&&!t.contains(e.target)&&(hideModal(activeClickModal),activeClickModal=null)}});`;
    }
}

/**
 * Génère le contenu HTML pour les nœuds du diagramme.
 */
class NodeContentGenerator {
    constructor(themeColors, modalManager) {
        this.themeColors = themeColors;
        this.modalManager = modalManager;
    }

    /**
     * Point d'entrée pour générer le contenu d'un nœud.
     * @param {object} element - La configuration de l'élément.
     * @returns {object} Un objet contenant le SVG, la largeur et la hauteur.
     */
    generateContent(element) {
        // Nouveau type: tableau (table simple avec en-tête + lignes)
        if (element.type === 'tableau') return this.generateTableNode(element);
        if (element.content_list) return this.generateFromContentList(element);
        if (element.html_content) return this.generateFromHTML(element);
        return this.generateDefaultContent();
    }

    /**
     * Génère le contenu à partir d'une `content_list` structurée.
     * @param {object} element - L'élément avec une `content_list`.
     * @returns {object} Un objet contenant le SVG, la largeur et la hauteur.
     */
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

    /**
     * Génère l'en-tête fixe (titre et sous-titre) d'un nœud.
     * @param {object} element - La configuration de l'élément.
     * @param {string} nodeBgColor - La couleur de fond du nœud.
     * @returns {string} Le HTML de l'en-tête.
     */
    generateHeader(element, nodeBgColor) {
        if (!element.title && !element.subtitle) return '';
        let headerHtml = `<div style="flex-shrink:0;padding:${CONFIG.padding}px ${CONFIG.padding}px 10px ${CONFIG.padding}px;background-color:${nodeBgColor};position:relative;z-index:1;">`;
        
        // Détermination de l'icône à afficher à gauche du titre
        const iconSvg = this.getTitleIconSvg(element);

    if (element.title) {
            headerHtml += `<h2 style="display:flex;align-items:center;gap:8px;justify-content:center;margin:0 0 ${element.subtitle ? '5px' : '0'} 0;font-size:20px;color:${this.themeColors.text};">${iconSvg ? `<span style='display:inline-flex;align-items:center;'>${iconSvg}</span>` : ''}<span>${element.title}</span></h2>`;
        }
        if (element.subtitle) headerHtml += `<p style="text-align:center;margin:0;font-size:14px;color:${this.themeColors.textFaded};">${element.subtitle}</p>`;
        headerHtml += '</div>';
        return headerHtml;
    }

    /**
     * Retourne l'icône à utiliser pour le titre selon les tags/type de l'élément.
     * Priorité: tags -> type.
     */
    getTitleIconSvg(element) {
        const tags = Array.isArray(element.tags) ? element.tags.map(t => String(t).toLowerCase()) : [];
        const type = (element.type || '').toLowerCase();

        // Mapping de tag/type -> icône
        const tagToIconKey = [
            { keys: ['person', 'user', 'people'], icon: 'user' },
            { keys: ['database', 'db', 'data'], icon: 'database' },
            { keys: ['api', 'service'], icon: 'api' },
            { keys: ['warning', 'alert', 'risk'], icon: 'warning' },
            { keys: ['new', 'add'], icon: 'new' },
            { keys: ['edit', 'update'], icon: 'edit' },
            { keys: ['delete', 'remove'], icon: 'delete' }
        ];

        // 1) Cherche dans les tags
        for (const mapping of tagToIconKey) {
            if (tags.some(t => mapping.keys.includes(t))) {
                return ICONS[mapping.icon] || '';
            }
        }
        // 2) Repli: cherche selon le type
        for (const mapping of tagToIconKey) {
            if (mapping.keys.includes(type)) {
                return ICONS[mapping.icon] || '';
            }
        }
        return '';
    }

    /**
     * Génère la zone de contenu scrollable d'un nœud.
     * @param {object} element - La configuration de l'élément.
     * @returns {string} Le HTML de la zone de contenu.
     */
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

    /**
     * Génère le HTML pour une section complète (titre et liste d'items).
     * @param {object} section - La configuration de la section.
     * @param {number} sectionIndex - L'index de la section.
     * @param {string} elementId - L'ID de l'élément parent.
     * @returns {string} Le HTML de la section.
     */
    generateSection(section, sectionIndex, elementId) {
        const sectionIcon = section.symbol ? ICONS[section.symbol] || '' : '';
        let html = `<div style="margin-top:15px;"><h3 style="font-size:16px;margin:0 0 8px 0;padding-bottom:5px;border-bottom:1px solid ${this.themeColors.border};font-weight:600;text-align:left;display:flex;align-items:center;">${sectionIcon ? `<div style="margin-right:8px;">${sectionIcon}</div>` : ''}<span>${section.label}</span></h3><ul style="margin:0;padding:0;list-style:none;">`;
        section.values.forEach((valueItem, valueIndex) => {
            html += this.generateListItem(valueItem, sectionIndex, valueIndex, elementId);
        });
        html += '</ul></div>';
        return html;
    }

    /**
     * Génère le HTML pour un item de liste individuel, avec ses interactions.
     * @param {object} valueItem - La configuration de l'item.
     * @param {number} sectionIndex - L'index de la section.
     * @param {number} valueIndex - L'index de l'item.
     * @param {string} elementId - L'ID de l'élément parent.
     * @returns {string} Le HTML de l'item.
     */
    generateListItem(valueItem, sectionIndex, valueIndex, elementId) {
        const id = `${elementId}-${sectionIndex}-${valueIndex}`;
        const iconSvg = valueItem.symbol ? ICONS[valueItem.symbol] || '' : '';
        const subtitleHtml = valueItem.subtitle ? `<p style="font-size:12px;color:${this.themeColors.textFaded};margin:2px 0 0 0;text-align:left;">${valueItem.subtitle}</p>` : '';
        const linkIcon = valueItem.url ? `<span style="margin-left:6px;opacity:0.6;">${ICONS.link}</span>` : '';
        const { eventHandlers, isInteractive } = this.generateEventHandlers(valueItem, id);
        return `<li style="display:flex;align-items:flex-start;margin:2px -8px;padding:8px;border-radius:6px;transition:background-color .2s;${isInteractive ? 'cursor:pointer;' : ''}" ${eventHandlers}>${iconSvg ? `<div style="flex-shrink:0;margin-top:3px;">${iconSvg}</div>` : ''}<div style="margin-left:${iconSvg ? '8px' : '0'};"><span>${valueItem.label}${linkIcon}</span>${subtitleHtml}</div></li>`;
    }

    /**
     * Génère les gestionnaires d'événements (onclick, onmouseover, etc.) pour un item.
     * @param {object} valueItem - La configuration de l'item.
     * @param {string} id - L'ID unique de l'item.
     * @returns {object} Un objet contenant les `eventHandlers` et un booléen `isInteractive`.
     */
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
        return { eventHandlers: Object.entries(handlers).map(([key, value]) => `${key}="${value}"`).join(' '), isInteractive };
    }

    /**
     * Génère le contenu à partir de HTML brut.
     * @param {object} element - L'élément avec `html_content`.
     * @returns {object} Un objet contenant le SVG, la largeur et la hauteur.
     */
    generateFromHTML(element) {
        const width = element.width || 200;
        const height = element.height || 100;
        const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${CONFIG.fontFamily};color:${this.themeColors.text};height:100%;width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;"><div>${element.html_content}</div></div>`;
        return { svg: `<foreignObject width="${width}" height="${height}">${html}</foreignObject>`, width, height };
    }

    /**
     * Génère un contenu par défaut si aucun autre n'est spécifié.
     * @returns {object} Un objet contenant un SVG de fallback.
     */
    generateDefaultContent() { return { svg: `<text x="10" y="20">No content</text>`, width: 200, height: 100 }; }

    /**
     * NOUVEAU: Génère un nœud de type "tableau".
     * 
     * YAML attendu:
     *   - id: table1
     *     type: tableau
     *     title: "Titre de table"
     *     width: 500
     *     height: 260
     *     columns: ["Col 1", "Col 2", "Col 3"]
     *     rows:
     *       - ["a", "b", "c"]
     *       - ["d", "e", "f"]
     */
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

        // Calcule les largeurs des colonnes de manière uniforme
        const colCount = Math.max(1, columns.length || (rows[0] ? rows[0].length : 1));
        const cellPadding = 8;
        const tablePadding = 10;
        const innerWidth = width - (tablePadding * 2);
        const colWidth = Math.floor(innerWidth / colCount);

        // Calcul de la hauteur disponible pour le tableau (en enlevant l'en-tête éventuel)
        const headerHeight = element.title ? 40 : 0;
        const innerHeight = height - headerHeight - tablePadding * 2;
        const rowHeight = 28;
        const headerRowHeight = colCount > 0 ? 30 : 0;
        const maxVisibleRows = Math.floor((innerHeight - headerRowHeight) / rowHeight);
        const visibleRows = rows.slice(0, Math.max(0, maxVisibleRows));

        let html = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${CONFIG.fontFamily};color:${text};height:100%;width:100%;box-sizing:border-box;display:flex;flex-direction:column;background:${nodeBgColor};">`;

        // En-tête optionnel
        if (element.title) {
            html += `<div style="flex-shrink:0;padding:${CONFIG.padding}px ${CONFIG.padding}px 8px ${CONFIG.padding}px;background-color:${nodeBgColor};border-bottom:1px solid ${border};"><h2 style="margin:0;font-size:18px;color:${text};text-align:center;">${element.title}</h2>${element.subtitle ? `<p style="margin:4px 0 0 0;font-size:13px;color:${textFaded};text-align:center;">${element.subtitle}</p>` : ''}</div>`;
        }

        // Conteneur scrollable pour la table
        html += `<div style="flex-grow:1;overflow:auto;padding:${tablePadding}px;">`;

        // Table
        html += `<div style="border:1px solid ${border};border-radius:6px;overflow:hidden;">`;
        
        // Ligne d'en-tête
        if (colCount > 0) {
            html += `<div style="display:flex;background:${this.themeColors.background};border-bottom:1px solid ${border};">`;
            for (let c = 0; c < colCount; c++) {
                const label = columns[c] !== undefined ? String(columns[c]) : `Col ${c+1}`;
                html += `<div style="width:${colWidth}px;box-sizing:border-box;padding:${cellPadding}px;font-weight:600;color:${text};border-right:${c < colCount-1 ? `1px solid ${border}` : 'none'};">${label}</div>`;
            }
            html += `</div>`;
        }

        // Lignes
        visibleRows.forEach((row, idx) => {
            const bg = idx % 2 === 0 ? 'transparent' : this.themeColors.clusterBg;
            html += `<div style="display:flex;background:${bg};border-bottom:${idx < visibleRows.length-1 ? `1px solid ${border}` : 'none'};">`;
            for (let c = 0; c < colCount; c++) {
                const value = row && row[c] !== undefined ? String(row[c]) : '';
                html += `<div style="width:${colWidth}px;box-sizing:border-box;padding:${cellPadding}px;color:${text};border-right:${c < colCount-1 ? `1px solid ${border}` : 'none'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</div>`;
            }
            html += `</div>`;
        });

        // Footer si des lignes sont masquées
        if (rows.length > visibleRows.length) {
            const remaining = rows.length - visibleRows.length;
            html += `<div style="padding:${cellPadding}px;color:${textFaded};font-size:12px;border-top:1px dashed ${border};text-align:right;">+ ${remaining} lignes supplémentaires…</div>`;
        }

        html += `</div>`; // fin table
        html += `</div>`; // fin conteneur scrollable
        html += `</div>`; // fin racine

        const svgContent = `<foreignObject width="${width}" height="${height}">${html}</foreignObject>`;
        return { svg: svgContent, width, height };
    }
}

/**
 * Génère le contenu HTML pour les labels des relations.
 */
class RelationLabelGenerator {
    constructor(themeColors) { this.themeColors = themeColors; }

    /**
     * Génère le label complet pour une relation.
     * @param {object} relation - La configuration de la relation.
     * @returns {string} Le HTML du label.
     */
    generateLabel(relation) {
        const bgColor = this.themeColors.api;
        const borderColor = this.themeColors.border;
        let html = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${CONFIG.fontFamily};color:${this.themeColors.text};padding:10px;height:100%;width:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;background-color:${bgColor};border:1px solid ${borderColor};border-radius:${CONFIG.borderRadius}px;"><div>`;
        if (relation.title) html += `<h4 style="text-align:center;margin:0 0 8px 0;font-weight:600;">${relation.title}</h4>`;
        if (relation.subtitle) html += `<p style="text-align:center;margin:0 0 8px 0;font-size:12px;color:${this.themeColors.textFaded};">${relation.subtitle}</p>`;
        if (relation.content_list) {
            html += `<ul style="text-align:left;padding-left:15px;margin:0;list-style:none;">`;
            relation.content_list.forEach(item => {
                const iconSvg = item.symbol ? ICONS[item.symbol] || '' : '';
                html += `<li style="display:flex;align-items:center;margin-bottom:5px;font-size:13px;">${iconSvg ? `<div style="margin-right:5px;">${iconSvg}</div>` : ''}<span>${item.label}</span></li>`;
            });
            html += `</ul>`;
        }
        html += '</div></div>';
        return html;
    }
}

// =============================================================================
// GÉNÉRATEUR PRINCIPAL DE DIAGRAMME
// =============================================================================

/**
 * Classe principale qui orchestre la génération du diagramme SVG.
 */
class DiagramGenerator {
    constructor(theme = 'light', layout = 'TB') {
        this.themeColors = THEMES[theme] || THEMES.light;
        this.layout = layout;
        this.modalManager = new ModalManager();
        this.nodeGenerator = new NodeContentGenerator(this.themeColors, this.modalManager);
        this.labelGenerator = new RelationLabelGenerator(this.themeColors);
    }

    /** Redimensionne un SVG d'icône (width/height) à la taille demandée. */
    sizeIconSvg(svg, size = 20) {
        if (!svg) return '';
        return String(svg)
            .replace(/width="\d+"/i, `width="${size}"`)
            .replace(/height="\d+"/i, `height="${size}"`);
    }

    /**
     * Retourne une icône pertinente pour un groupe selon son libellé.
     * On utilise les mêmes mots-clés que pour les éléments (tags/type-like).
     * @param {string} groupLabel
     * @returns {string} SVG string or empty string
     */
    getGroupIconSvg(groupLabel) {
        if (!groupLabel) return '';
        const label = String(groupLabel).toLowerCase();
        const mapping = [
            { keys: ['person', 'user', 'people', 'humain', 'utilisateur'], icon: 'user' },
            { keys: ['database', 'db', 'donnée', 'data'], icon: 'database' },
            { keys: ['api', 'service'], icon: 'api' },
            { keys: ['warning', 'alert', 'risque', 'risk'], icon: 'warning' },
            { keys: ['module', 'package'], icon: 'module' },
            { keys: ['info', 'information'], icon: 'info' }
        ];
        for (const m of mapping) {
            if (m.keys.some(k => label.includes(k))) return ICONS[m.icon] || '';
        }
        return '';
    }

    /**
     * Génère le diagramme SVG complet à partir des données.
     * @param {object} diagramData - Les données parsées du fichier YAML.
     * @returns {string} Le code SVG final.
     */
    generateSVG(diagramData) {
        const graph = this.createGraph(diagramData);
        dagre.layout(graph);
        return this.renderSVG(graph);
    }

    /**
     * Crée et configure le graphe Dagre avec les nœuds, groupes et arêtes.
     * @param {object} diagramData - Les données du diagramme.
     * @returns {object} Le graphe Dagre prêt pour le layout.
     */
    createGraph(diagramData) {
        const graph = new dagre.graphlib.Graph({ compound: true });
        graph.setGraph({ ...CONFIG.layoutDefaults, rankdir: this.layout });
        graph.setDefaultEdgeLabel(() => ({}));
        this.createGroups(graph, diagramData);
        this.addNodes(graph, diagramData);
        this.addEdges(graph, diagramData);
        return graph;
    }

    /**
     * Crée les clusters (groupes) dans le graphe.
     * @param {object} graph - Le graphe Dagre.
     * @param {object} diagramData - Les données du diagramme.
     */
    createGroups(graph, diagramData) {
        const groups = [...new Set(diagramData.elements.filter(e => e.group).map(e => e.group))];
        groups.forEach(group => {
            graph.setNode(group, { label: group, clusterLabelPos: 'top', style: `fill:${this.themeColors.clusterBg};stroke:${this.themeColors.border}` });
        });
    }

    /**
     * Ajoute les nœuds (éléments) au graphe.
     * @param {object} graph - Le graphe Dagre.
     * @param {object} diagramData - Les données du diagramme.
     */
    addNodes(graph, diagramData) {
    diagramData.elements.forEach(element => {
            const { svg, width, height } = this.nodeGenerator.generateContent(element);
        element.generatedSvg = svg;
            graph.setNode(element.id, { label: element.title, width, height, ...element });
            if (element.group) graph.setParent(element.id, element.group);
        });
    }

    /**
     * Ajoute les arêtes (relations) au graphe.
     * @param {object} graph - Le graphe Dagre.
     * @param {object} diagramData - Les données du diagramme.
     */
    addEdges(graph, diagramData) {
    diagramData.relations.forEach(relation => {
            const edgeProps = { ...relation };
            if ((relation.title || relation.content_list) && !relation.width) {
                edgeProps.width = 180;
                edgeProps.height = 50;
            }
            graph.setEdge(relation.from, relation.to, edgeProps);
        });
    }

    /**
     * Génère le rendu final du SVG à partir du graphe positionné.
     * @param {object} graph - Le graphe après layout.
     * @returns {string} Le code SVG complet.
     */
    renderSVG(graph) {
        const graphWidth = graph.graph().width || 1200;
        const graphHeight = graph.graph().height || 800;
        let svg = this.generateSVGHeader(graphWidth, graphHeight);
        svg += this.generateStylesAndScripts();
        svg += '<g transform="translate(25, 25)">';
        // Fond des clusters (rectangles)
        svg += this.renderClusterBackgroundsSimple(graph);
        svg += this.renderEdges(graph);
        svg += this.renderNodes(graph);
        // En-têtes (icône + titre) rendus par-dessus, à l'intérieur du cluster
        svg += this.renderClusterHeadersInside(graph);
        svg += '</g>';
        svg += `<foreignObject x="0" y="0" width="100%" height="100%" style="pointer-events:none;">${this.modalManager.generateModalsHTML(this.themeColors)}</foreignObject>`;
        svg += '</svg>';
        return svg;
    }

    /**
     * Génère l'en-tête du fichier SVG.
     * @param {number} width - La largeur du SVG.
     * @param {number} height - La hauteur du SVG.
     * @returns {string} Le code de l'en-tête SVG.
     */
    generateSVGHeader(width, height) {
        return `<svg width="${width + 50}" height="${height + 50}" xmlns="http://www.w3.org/2000/svg" style="background-color:${this.themeColors.background};font-family:${CONFIG.fontFamily};">`;
    }

    /**
     * Génère la section `<defs>` contenant les styles CSS et le code JavaScript.
     * @returns {string} Le code de la section `<defs>`.
     */
    generateStylesAndScripts() {
        // Injecte aussi un client SSE minimal qui recharge la page quand /events pousse "reload"
        const sseClient = `(()=>{try{const es=new EventSource('/events');es.onmessage=(e)=>{if(e&&e.data==='reload'){location.reload();}};}catch(e){console.warn('SSE indisponible',e);}})();`;
        return `<defs><style type="text/css"><![CDATA[.edge-label{font-size:11px;fill:${this.themeColors.textFaded};text-anchor:middle;dominant-baseline:middle}.cluster-label{fill:${this.themeColors.text};font-weight:700;font-size:20px;text-anchor:middle}${this.modalManager.generateModalCSS(this.themeColors)}]]></style><script type="application/javascript"><![CDATA[${this.modalManager.generateModalJS()}${sseClient}]]></script><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${this.themeColors.arrow}"/></marker></defs>`;
    }

    /**
     * Génère le rendu SVG pour les clusters (groupes).
     * @param {object} graph - Le graphe positionné.
     * @returns {string} Le code SVG des clusters.
     */
    // Fond simple des clusters (rectangles seulement)
    renderClusterBackgroundsSimple(graph) {
        let svg = '';
        graph.nodes().forEach(nodeId => {
            const node = graph.node(nodeId);
            if (node.clusterLabelPos) {
                const x = node.x - node.width / 2;
                const y = node.y - node.height / 2;
                svg += `<g transform="translate(${x},${y})"><rect width="${node.width}" height="${node.height}" rx="${CONFIG.borderRadius}" ry="${CONFIG.borderRadius}" fill="${this.themeColors.clusterBg}" stroke="${this.themeColors.border}" stroke-width="1.5"/></g>`;
            }
        });
        return svg;
    }

    // Titre + icône à l'intérieur du cluster, en surimpression (ne change pas le layout)
    renderClusterHeadersInside(graph) {
        let svg = '';
        const headerHeight = 56; // zone visuelle pour le titre
        const gapTop = 0;        // pas de masque sous le titre pour ne pas cacher le 1er élément
        const gapBottom = 14;    // espace visuel au bas du cluster
        graph.nodes().forEach(nodeId => {
            const node = graph.node(nodeId);
            if (node.clusterLabelPos) {
                const x = node.x - node.width / 2;
                const y = node.y - node.height / 2;
                const icon = this.sizeIconSvg(this.getGroupIconSvg(node.label), 18);
                const headerHtml = `
                    <div xmlns="http://www.w3.org/1999/xhtml" style="height:${headerHeight}px;display:flex;align-items:center;justify-content:center;padding:10px 0;">
                        <div style="display:flex;align-items:center;gap:8px;color:${this.themeColors.text};font-family:${CONFIG.fontFamily};font-weight:700;font-size:20px;">
                            ${icon ? `<span style=\"display:inline-flex;align-items:center;\">${icon}</span>` : ''}
                            <span>${node.label}</span>
                        </div>
                    </div>`;
                const topMaskH = headerHeight + gapTop; // = headerHeight
                const bottomMaskY = Math.max(0, node.height - gapBottom);
                svg += `<g transform="translate(${x},${y})">
                            <rect x="0" y="0" width="${node.width}" height="${topMaskH}" fill="${this.themeColors.clusterBg}" style="pointer-events:none"/>
                            <rect x="0" y="${bottomMaskY}" width="${node.width}" height="${gapBottom}" fill="${this.themeColors.clusterBg}" style="pointer-events:none"/>
                            <foreignObject x="0" y="0" width="${node.width}" height="${headerHeight}">${headerHtml}</foreignObject>
                        </g>`;
            }
        });
        return svg;
    }

    /**
     * Génère le rendu SVG pour les arêtes (relations).
     * @param {object} graph - Le graphe positionné.
     * @returns {string} Le code SVG des arêtes.
     */
    renderEdges(graph) {
        let svg = '';
        graph.edges().forEach(e => {
            const edge = graph.edge(e);
        const pathData = edge.points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');
            let strokeStyle = '';
            if (edge.style === 'dashed') strokeStyle = 'stroke-dasharray="5, 5"';
            if (edge.style === 'dotted') strokeStyle = 'stroke-dasharray="2, 3"';
            const strokeColor = edge.color || this.themeColors.border;
            svg += `<path d="${pathData}" stroke="${strokeColor}" stroke-width="2" fill="none" marker-end="url(#arrow)" ${strokeStyle}/>`;
            svg += this.renderEdgeLabel(edge);
        });
        return svg;
    }

    /**
     * Génère le rendu SVG pour le label d'une arête.
     * @param {object} edge - La configuration de l'arête.
     * @returns {string} Le code SVG du label.
     */
    renderEdgeLabel(edge) {
        const x = edge.x - (edge.width || 0) / 2;
        const y = edge.y - (edge.height || 0) / 2;
        if (edge.content_list || edge.title) {
            const html = this.labelGenerator.generateLabel(edge);
            return `<g transform="translate(${x},${y})"><foreignObject width="${edge.width}" height="${edge.height}">${html}</foreignObject></g>`;
        } else if (edge.html_label) {
            const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${CONFIG.fontFamily};height:100%;width:100%;box-sizing:border-box;">${edge.html_label}</div>`;
            return `<g transform="translate(${x},${y})"><foreignObject width="${edge.width}" height="${edge.height}">${html}</foreignObject></g>`;
        } else if (edge.label) {
            return `<rect x="${edge.x-(edge.width/2)}" y="${edge.y-(edge.height/2)}" width="${edge.width}" height="${edge.height}" fill="${this.themeColors.background}"/><text x="${edge.x}" y="${edge.y}" class="edge-label">${edge.label}</text>`;
        }
        return '';
    }

    /**
     * Génère le rendu SVG pour les nœuds.
     * @param {object} graph - Le graphe positionné.
     * @returns {string} Le code SVG des nœuds.
     */
    renderNodes(graph) {
        let svg = '';
        graph.nodes().forEach(nodeId => {
            const node = graph.node(nodeId);
            if (!node.clusterLabelPos) {
        const x = node.x - node.width / 2;
        const y = node.y - node.height / 2;
        const type = node.type || 'default';
                const fillColor = this.themeColors[type] || this.themeColors.default;
                const borderColor = this.themeColors.border;
                const shapeSpec = node.shape || { type: 'rect' };
                const shapeSvg = ShapeBuilder.buildShapeSvg(shapeSpec, node.width, node.height, fillColor, borderColor, CONFIG.borderRadius);
        svg += `
                    <g transform="translate(${x},${y})">
                        ${shapeSvg}
                ${node.generatedSvg}
            </g>
        `;
            }
    });
    return svg;
}
}

/**
 * Construit des formes vectorielles pour entourer les nœuds.
 * Supporte: rect, rounded, diamond, hexagon, triangle, parallelogram,
 *           arrow-right/left/up/down, regular-polygon, custom-polygon.
 */
class ShapeBuilder {
    static buildShapeSvg(shape, width, height, fill, stroke, defaultRadius) {
        const type = (shape && shape.type) ? String(shape.type).toLowerCase() : 'rect';
        switch (type) {
            case 'rounded':
            case 'rounded-rect':
                return `<rect width="${width}" height="${height}" rx="${shape.radius ?? defaultRadius}" ry="${shape.radius ?? defaultRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            case 'rect':
                return `<rect width="${width}" height="${height}" rx="${shape.radius ?? defaultRadius}" ry="${shape.radius ?? defaultRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            case 'diamond': {
                const pts = this.pointsDiamond(width, height);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'hexagon': {
                const pts = this.pointsRegularPolygon(width, height, 6, shape.rotation || 0);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'triangle': {
                const orient = shape.orientation || 'up';
                const pts = this.pointsTriangle(width, height, orient);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'parallelogram': {
                const skew = typeof shape.skew === 'number' ? shape.skew : 0.15; // fraction du width
                const pts = this.pointsParallelogram(width, height, skew);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'arrow-right': {
                const head = typeof shape.head === 'number' ? shape.head : 0.35; // fraction du width
                const pts = this.pointsArrowRight(width, height, head);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'arrow-left': {
                const head = typeof shape.head === 'number' ? shape.head : 0.35;
                const pts = this.pointsArrowLeft(width, height, head);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'arrow-up': {
                const head = typeof shape.head === 'number' ? shape.head : 0.35;
                const pts = this.pointsArrowUp(width, height, head);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'arrow-down': {
                const head = typeof shape.head === 'number' ? shape.head : 0.35;
                const pts = this.pointsArrowDown(width, height, head);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'regular-polygon': {
                const sides = Math.max(3, parseInt(shape.sides || 5, 10));
                const rot = shape.rotation || 0;
                const pts = this.pointsRegularPolygon(width, height, sides, rot);
                return `<polygon points="${this.pointsToString(pts)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            case 'custom-polygon': {
                // points en coordonnées normalisées 0..1 : [[x,y],...]
                const raw = Array.isArray(shape.points) ? shape.points : [];
                const rot = shape.rotation || 0;
                const pts = raw.map(p => [p[0] * width, p[1] * height]);
                const rotated = rot ? this.rotatePoints(pts, rot, width / 2, height / 2) : pts;
                return `<polygon points="${this.pointsToString(rotated)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
            }
            default:
                return `<rect width="${width}" height="${height}" rx="${CONFIG.borderRadius}" ry="${CONFIG.borderRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
        }
    }

    static pointsDiamond(w, h) {
        const cx = w / 2, cy = h / 2;
        return [[cx, 0], [w, cy], [cx, h], [0, cy]];
    }
    static pointsTriangle(w, h, orientation) {
        const map = {
            up: [[w / 2, 0], [w, h], [0, h]],
            down: [[0, 0], [w, 0], [w / 2, h]],
            left: [[0, h / 2], [w, 0], [w, h]],
            right: [[0, 0], [w, h / 2], [0, h]]
        };
        return map[String(orientation).toLowerCase()] || map.up;
    }
    static pointsParallelogram(w, h, skewFrac) {
        const dx = Math.max(0, Math.min(0.4, skewFrac)) * w;
        return [[dx, 0], [w, 0], [w - dx, h], [0, h]];
    }
    static pointsArrowRight(w, h, headFrac) {
        const head = Math.max(0.2, Math.min(0.8, headFrac)) * w;
        const body = w - head;
        return [[0, 0], [body, 0], [w, h / 2], [body, h], [0, h]];
    }
    static pointsArrowLeft(w, h, headFrac) {
        const head = Math.max(0.2, Math.min(0.8, headFrac)) * w;
        const body = w - head;
        return [[w, 0], [head, 0], [0, h / 2], [head, h], [w, h]];
    }
    static pointsArrowUp(w, h, headFrac) {
        const head = Math.max(0.2, Math.min(0.8, headFrac)) * h;
        const body = h - head;
        return [[0, h], [0, head], [w / 2, 0], [w, head], [w, h]];
    }
    static pointsArrowDown(w, h, headFrac) {
        const head = Math.max(0.2, Math.min(0.8, headFrac)) * h;
        const body = h - head;
        return [[0, 0], [0, body], [w / 2, h], [w, body], [w, 0]];
    }
    static pointsRegularPolygon(w, h, sides, rotationDeg) {
        const cx = w / 2, cy = h / 2;
        const r = Math.min(w, h) / 2;
        const rot = (rotationDeg || 0) * Math.PI / 180;
        const pts = [];
        for (let i = 0; i < sides; i++) {
            const a = rot + i * 2 * Math.PI / sides;
            pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        return pts;
    }
    static rotatePoints(pts, deg, cx, cy) {
        const rad = (deg * Math.PI) / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        return pts.map(([x, y]) => {
            const dx = x - cx, dy = y - cy;
            return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
        });
    }
    static pointsToString(pts) {
        return pts.map(p => `${Math.round(p[0] * 1000) / 1000},${Math.round(p[1] * 1000) / 1000}`).join(' ');
    }
}

// =============================================================================
// FONCTION PRINCIPALE ET POINT D'ENTRÉE
// =============================================================================

/**
 * Point d'entrée principal du script. Gère les arguments de la ligne de
 * commande, initialise le générateur et démarre le serveur web.
 */
function main() {
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: node $0 <file> [options]')
        .command('$0 <file>', 'Génère un diagramme SVG et le sert localement', (yargs) => {
            yargs.positional('file', { describe: 'Chemin vers le fichier de description .yaml', type: 'string' });
        })
        .option('port', { alias: 'p', type: 'number', description: 'Port pour le serveur web', default: 3000 })
        .option('theme', { alias: 't', type: 'string', description: 'Thème visuel (light ou dark)', default: 'light', choices: ['light', 'dark'] })
        .option('layout', { alias: 'l', type: 'string', description: 'Direction du layout (TB, BT, LR, RL)', default: 'TB', choices: ['TB', 'BT', 'LR', 'RL'] })
        .option('start-client', { alias: 'c', type: 'boolean', description: 'Démarrer aussi le client React', default: false })
        .demandCommand(1, 'Vous devez spécifier un fichier.')
        .help().alias('h', 'help').argv;

    const filePath = path.resolve(argv.file);
    const port = argv.port;
    const theme = argv.theme;
    const layout = argv.layout;
    const shouldStartClient = argv['start-client'];

    if (!fs.existsSync(filePath)) {
        console.error(`❌ Erreur: Le fichier '${filePath}' n'a pas été trouvé.`);
        process.exit(1);
    }

    try {
        console.log(`📖 Lecture du fichier: ${filePath}`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let diagramData = yaml.load(fileContent);

        console.log(`🎨 Génération du diagramme (thème: ${theme}, layout: ${layout})`);
        const generator = new DiagramGenerator(theme, layout);
        let svgOutput = generator.generateSVG(diagramData);

        // Clients SSE connectés pour le rafraîchissement temps réel
        const sseClients = new Set();

        // Regénère le SVG et notifie les clients SSE
        const notifyReload = () => {
            for (const res of sseClients) {
                try { res.write('data: reload\n\n'); } catch (_) {}
            }
        };

        const regenerateSvg = () => {
            try {
                const nextContent = fs.readFileSync(filePath, 'utf8');
                diagramData = yaml.load(nextContent);
                svgOutput = generator.generateSVG(diagramData);
                console.log(`[${new Date().toISOString()}] 🔁 Diagramme régénéré`);
            } catch (err) {
                console.error('Erreur lors de la régénération:', err.message);
            }
        };

        // Debounce pour éviter les régénérations multiples
        let watchTimer = null;
        fs.watch(filePath, { persistent: true }, () => {
            clearTimeout(watchTimer);
            watchTimer = setTimeout(() => {
                regenerateSvg();
                notifyReload();
            }, 100);
        });

        // --- Serveur Express ---
        const app = express();
        app.use(cors());
        app.use(express.json({ limit: '2mb' }));

        // SSE pour reload auto de la page simple (ancienne page)
        app.get('/events', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });
            res.write('retry: 1000\n\n');
            sseClients.add(res);
            req.on('close', () => { sseClients.delete(res); });
        });

        // Route legacy: renvoie le SVG courant (pour compat direct)
        app.get('/', (req, res) => {
            console.log(`[${new Date().toISOString()}] 📊 GET / → SVG`);
            res.type('image/svg+xml').send(svgOutput);
        });

        // API React: génère un SVG à partir d’un JSON YAML-like envoyé par l’app
        app.post('/api/generate-diagram', (req, res) => {
            try {
                const payload = req.body;
                if (!payload || !payload.elements || !payload.relations) {
                    return res.status(400).json({ error: 'Payload invalide: elements et relations requis' });
                }
                const requestedTheme = typeof payload.theme === 'string' ? String(payload.theme).toLowerCase() : null;
                const safeTheme = requestedTheme && (requestedTheme === 'dark' || requestedTheme === 'light') ? requestedTheme : theme;
                const svg = new DiagramGenerator(safeTheme, layout).generateSVG(payload);
                res.type('image/svg+xml').send(svg);
            } catch (e) {
                console.error('Erreur /api/generate-diagram:', e);
                res.status(500).json({ error: 'Erreur génération', message: e.message });
            }
        });

        // Serveur HTTP
        const server = http.createServer(app);

        // Routes supplémentaires pour l'app React
        app.get('/api/current-diagram', (req, res) => {
            try {
                const requestedTheme = typeof req.query.theme === 'string' ? String(req.query.theme).toLowerCase() : null;
                if (requestedTheme && (requestedTheme === 'dark' || requestedTheme === 'light')) {
                    const svg = new DiagramGenerator(requestedTheme, layout).generateSVG(diagramData);
                    return res.type('image/svg+xml').send(svg);
                }
                return res.type('image/svg+xml').send(svgOutput);
            } catch (e) {
                console.error('Erreur /api/current-diagram:', e);
                res.status(500).type('text/plain').send('Erreur');
            }
        });
        app.get('/api/current-data', (req, res) => {
            res.json(diagramData || { elements: [], relations: [] });
        });

        server.listen(port, async () => {
            console.log(`\n🎉 Diagramme généré avec succès !`);
            console.log(`   📊 Éléments: ${diagramData.elements.length}`);
            console.log(`   🔗 Relations: ${diagramData.relations.length}`);
            console.log(`   🎨 Thème: ${theme}`);
            console.log(`   📐 Layout: ${layout}`);
            console.log(`   🌐 Serveur: http://localhost:${port}`);
            console.log(`\n⚡ Le serveur écoute sur le port ${port}`);
            console.log(`   Ouvrez votre navigateur à l'adresse suivante :`);
            console.log(`   \x1b[32m\x1b[1mhttp://localhost:${port}\x1b[0m`);
            console.log(`\n(Appuyez sur Ctrl+C pour arrêter le serveur)`);

            if (shouldStartClient) {
                // Lance le client React (port par défaut 5173 ou 3001 selon config)
                // On laisse l’app client utiliser window.location.origin → configurer un proxy/devServer si nécessaire.
                const child = spawn('npm', ['start'], {
                    cwd: path.join(process.cwd(), 'diagram-client'),
                    stdio: 'inherit',
                    env: { ...process.env }
                });
                child.on('close', (code) => {
                    console.log(`Client React arrêté (code ${code}).`);
                });
            }
        });

    } catch (error) {
        console.error("\n❌ Une erreur est survenue lors de la génération du diagramme :");
        console.error(`   ${error.message}`);
        if (error.stack) {
            console.error("\n🔍 Stack trace :");
            console.error(error.stack);
        }
        process.exit(1);
    }
}

if (require.main === module) {
main();
}

module.exports = { DiagramGenerator };