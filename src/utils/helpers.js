import DOMPurify from 'dompurify';
import { ON_GOING_KEYWORDS, NOTIFICATION_EMAIL_DOMAIN } from '../constants';
import { extractEmailPrefix } from './permissions';
import logger from './logger';

export const extractProgressByDateRange = (progressText, startDate, endDate) => {
    if (!progressText || (!startDate && !endDate)) return progressText;
    const datePatternGlobal = /(?:^|[^\d])(\d{4}[-\/])?(\d{1,2})[-\/](\d{1,2})(?=[^\d]|$)/g;
    const lines = progressText.split('\n');
    const currentYear = new Date().getFullYear();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    const filteredLines = lines.filter(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return true;
        const matches = [...trimmedLine.matchAll(datePatternGlobal)];
        if (matches.length === 0) return true;
        for (const match of matches) {
            const year = match[1] ? parseInt(match[1].replace(/[-\/]$/, '')) : currentYear;
            const month = parseInt(match[2]) - 1;
            const day = parseInt(match[3]);
            const lineDate = new Date(year, month, day);
            const inRange = (!start || lineDate >= start) && (!end || lineDate <= end);
            if (inRange) return true;
        }
        return false;
    });
    return filteredLines.join('\n');
};

export const callGeminiAI = async (contentParts, apiKey, model = 'gemini-2.5-flash') => {
    if (!apiKey) {
        throw new Error("尚未設定 Gemini API Key，請至系統設定填寫。");
    }
    // NOTE: API Key is passed via URL parameter as required by Google's API.
    // For production, consider using a backend proxy to avoid exposing the key in browser.
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: contentParts }] })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('AI 回應格式異常，請稍後再試');
        return text;
    } catch (error) {
        logger.error("Gemini API Error:", error);
        throw error;
    }
};

export const cleanAIResponse = (text) => {
    if (!text) return "";
    return text
        .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, '').trim())
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^>\s?/gm, '')
        .replace(/^#+\s+/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/^\s*[•・‧]\s+/gm, '')
        .replace(/^\s*\|?[\s:-]+\|?\s*$/gm, '')
        .replace(/\|/g, ' ')
        .replace(/^[-*_]{3,}$/gm, '')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

export const isOnGoingStatus = (status) => {
    if (!status) return false;
    const normalized = status.trim().toLowerCase();
    return ON_GOING_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

export const resolveAssigneeEmail = (assignee, userEmails = []) => {
    const assigneePrefix = extractEmailPrefix(assignee);
    if (!assigneePrefix) return null;
    const registeredPrefixes = new Set(
        userEmails.filter(Boolean).map((email) => email.split('@')[0])
    );
    if (!registeredPrefixes.has(assigneePrefix)) return null;
    return `${assigneePrefix}${NOTIFICATION_EMAIL_DOMAIN}`;
};

export const formatLocalDate = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const shouldSkipLocaleNode = (node) => {
    if (!node || !node.parentElement) return true;
    if (!node.nodeValue || !node.nodeValue.trim()) return true;
    const parent = node.parentElement;
    const tag = parent.tagName;
    if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(tag)) return true;
    if (parent.closest('[contenteditable="true"]')) return true;
    if (parent.closest('[data-locale-ignore="true"]')) return true;
    return false;
};

export const applyLocaleToDocument = (locale, converters, originalTextMap, isUpdatingRef) => {
    if (!converters) return;
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    const converter = locale === "zh-Hans" ? converters.toSimplified : converters.toTraditional;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => (shouldSkipLocaleNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    let currentNode = walker.nextNode();
    while (currentNode) {
        const text = currentNode.nodeValue;
        if (locale === "zh-Hans") {
            if (!originalTextMap.has(currentNode)) {
                originalTextMap.set(currentNode, text);
            }
            currentNode.nodeValue = converter(text);
        } else {
            const original = originalTextMap.get(currentNode);
            currentNode.nodeValue = original || converter(text);
        }
        currentNode = walker.nextNode();
    }
    isUpdatingRef.current = false;
};

export const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(() => {
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
};

const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    document.body.removeChild(textArea);
};

export const extractContentForAI = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(DOMPurify.sanitize(htmlContent), 'text/html');
    const text = doc.body.textContent || "";
    const images = [];
    const imgTags = doc.body.getElementsByTagName('img');
    for (let i = 0; i < imgTags.length; i++) {
        const src = imgTags[i].src;
        if (src.startsWith('data:image/')) {
            const parts = src.split(',');
            if (parts.length === 2) {
                const mimeMatch = parts[0].match(/:(.*?);/);
                if (mimeMatch) {
                    images.push({ inlineData: { mimeType: mimeMatch[1], data: parts[1] } });
                }
            }
        }
    }
    return { text, images };
};

export const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
};
