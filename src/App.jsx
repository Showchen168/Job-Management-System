import React, { useState, useEffect, useMemo, useRef } from 'react';


import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { 
    getFirestore, collection, collectionGroup, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, setDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { 
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode
} from 'firebase/auth';

import { 
    CheckCircle2, Clock, AlertCircle, Calendar, Users, FileText, Settings, Plus, Save, X, Edit2, Trash2, Link as LinkIcon, ChevronRight, Database, RefreshCw, Check, ShieldAlert, Download, List, Search, ArrowRightLeft, LogIn, LogOut, UserPlus, Loader2, ExternalLink, ShieldCheck, Lock, UserCog, Image as ImageIcon, Info, User, Filter, Briefcase, LayoutDashboard, BarChart3, PieChart, Activity, Sparkles, Bot, Copy 
} from 'lucide-react';
import * as OpenCC from 'opencc-js';
import { marked } from 'marked';


// --- 0. System Constants ---
const SYSTEM_CREATOR = "Show";
const APP_VERSION = "v1.0.3"; // 團隊選擇只顯示用戶所屬團隊
const ON_GOING_KEYWORDS = ["on-going", "ongoing", "進行"];
const LOCALE_STORAGE_KEY = "jms-locale";
const DEFAULT_LOCALE = "zh-Hant";
const AIVRES_EMAIL_DOMAIN = "@aivres.com";
const NOTIFICATION_EMAIL_DOMAIN = "@aivres.com";

// --- 1. Firebase Configuration ---
const DEFAULT_CONFIG = {
    apiKey: "AIzaSyAGezrKXfKSwvh1Aauy-wrTr53e_WtuXVE",
    authDomain: "job-management-system-16741.firebaseapp.com",
    projectId: "job-management-system-16741",
    storageBucket: "job-management-system-16741.firebasestorage.app",
    messagingSenderId: "1042345096032",
    appId: "1:1042345096032:web:853c2d9c35c06b7dd9a405",
    measurementId: "G-FM8QW4LJ2T"
};

const ROOT_ADMINS = [
    "showchen@aivres.com",
];

const checkIsAdmin = (user, cloudAdmins = []) => {
    if (!user || !user.email) return false;
    return ROOT_ADMINS.includes(user.email) || cloudAdmins.includes(user.email);
};

const checkIsEditor = (user, cloudEditors = []) => {
    if (!user || !user.email) return false;
    return cloudEditors.includes(user.email);
};

const checkCanUseAI = (user, cloudAIUsers = []) => {
    if (!user || !user.email) return false;
    return cloudAIUsers.includes(user.email);
};

// 取得團隊的所有 Leader（支援新舊格式）
const getTeamLeaders = (team) => {
    if (!team) return [];
    if (team.leaderIds && Array.isArray(team.leaderIds)) {
        return team.leaderIds;
    }
    return team.leaderId ? [team.leaderId] : [];
};

// 檢查使用者是否為任一 Team 的 Leader
const checkIsLeader = (user, teams = []) => {
    if (!user || !user.email) return false;
    return teams.some(team => getTeamLeaders(team).includes(user.email));
};

// 取得 Leader 所管理的所有成員 email
const getLeaderTeamMembers = (user, teams = []) => {
    if (!user || !user.email) return [];
    const memberEmails = new Set();
    teams.forEach(team => {
        if (getTeamLeaders(team).includes(user.email)) {
            (team.members || []).forEach(m => memberEmails.add(m));
        }
    });
    return Array.from(memberEmails);
};

// 檢查用戶是否屬於任何團隊（作為成員或 Leader）
const checkIsInAnyTeam = (user, teams = []) => {
    if (!user || !user.email) return false;
    const userEmail = user.email.toLowerCase();
    return teams.some(team => {
        const leaders = getTeamLeaders(team).map(l => l.toLowerCase());
        const members = (team.members || []).map(m => m.toLowerCase());
        return leaders.includes(userEmail) || members.includes(userEmail);
    });
};

const formatEmailPrefix = (email) => {
    if (!email) return '使用者';
    const [prefix] = email.split('@');
    return prefix || email;
};

// --- Helper Functions ---

// 從進展文字中提取指定日期範圍的內容
// 規則：檢測行內任意位置的日期，只保留日期在範圍內的行或無日期的行
const extractProgressByDateRange = (progressText, startDate, endDate) => {
    if (!progressText || (!startDate && !endDate)) return progressText;

    // 日期正則：支援行內任意位置的日期格式
    // M/D, MM/DD, YYYY/M/D, M-D, MM-DD, YYYY-M-D
    const datePatternGlobal = /(?:^|[^\d])(\d{4}[-\/])?(\d{1,2})[-\/](\d{1,2})(?=[^\d]|$)/g;

    const lines = progressText.split('\n');
    const currentYear = new Date().getFullYear();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    // 將 end 設為當天結束時間
    if (end) end.setHours(23, 59, 59, 999);

    const filteredLines = lines.filter(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return true; // 空行保留

        // 找出行內所有日期
        const matches = [...trimmedLine.matchAll(datePatternGlobal)];

        // 沒有任何日期的行保留
        if (matches.length === 0) return true;

        // 檢查所有找到的日期，至少有一個在範圍內就保留
        for (const match of matches) {
            const year = match[1] ? parseInt(match[1].replace(/[-\/]$/, '')) : currentYear;
            const month = parseInt(match[2]) - 1;
            const day = parseInt(match[3]);
            const lineDate = new Date(year, month, day);

            const inRange = (!start || lineDate >= start) && (!end || lineDate <= end);
            if (inRange) return true;
        }

        // 所有日期都不在範圍內，過濾掉
        return false;
    });

    return filteredLines.join('\n');
};

const callGeminiAI = async (contentParts, apiKey, model = 'gemini-2.5-flash') => {
    if (!apiKey) {
        throw new Error("尚未設定 Gemini API Key，請至系統設定填寫。");
    }
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
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};

const cleanAIResponse = (text) => {
    if (!text) return "";
    return text
        .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, '').trim())
        .replace(/!\[.*?\]\(.*?\)/g, '')               // 移除圖片標記
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')       // 移除連結格式
        .replace(/^>\s?/gm, '')                        // 移除引用
        .replace(/^#+\s+/gm, '')                       // 移除標題標記 (#, ##, ###)
        .replace(/^\s*[-*+]\s+/gm, '')                 // 移除無序清單
        .replace(/^\s*\d+\.\s+/gm, '')                 // 移除有序清單
        .replace(/^\s*[•・‧]\s+/gm, '')                 // 移除特殊符號清單
        .replace(/^\s*\|?[\s:-]+\|?\s*$/gm, '')         // 移除表格分隔線
        .replace(/\|/g, ' ')                           // 移除表格管線符號
        .replace(/^[-*_]{3,}$/gm, '')                  // 移除分隔線
        .replace(/(\*\*|__)(.*?)\1/g, '$2')             // 移除粗體標記
        .replace(/(\*|_)(.*?)\1/g, '$2')               // 移除斜體標記
        .replace(/~~(.*?)~~/g, '$1')                   // 移除刪除線
        .replace(/`/g, '')                             // 移除行內代碼標記
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const isOnGoingStatus = (status) => {
    if (!status) return false;
    const normalized = status.trim().toLowerCase();
    return ON_GOING_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const extractEmailPrefix = (value) => {
    if (!value) return null;
    const normalized = String(value).trim();
    if (!normalized) return null;
    if (normalized.includes('@')) {
        const [prefix] = normalized.split('@');
        return prefix || null;
    }
    return normalized;
};

const normalizePermissionEmail = (value) => {
    if (!value) return '';
    const normalized = String(value).trim();
    if (!normalized) return '';
    return normalized.toLowerCase();
};

const resolveAssigneeEmail = (assignee, userEmails = []) => {
    const assigneePrefix = extractEmailPrefix(assignee);
    if (!assigneePrefix) return null;
    const registeredPrefixes = new Set(
        userEmails
            .filter(Boolean)
            .map((email) => email.split('@')[0])
    );
    if (!registeredPrefixes.has(assigneePrefix)) return null;
    return `${assigneePrefix}${NOTIFICATION_EMAIL_DOMAIN}`;
};

const formatLocalDate = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildNotificationPayloads = (tasks, userEmails, notifyDate = new Date()) => {
    const displayDate = formatLocalDate(notifyDate);
    const notifications = {};
    tasks.forEach((task) => {
        if (!isOnGoingStatus(task.status)) return;
        const assigneeEmail = resolveAssigneeEmail(task.assignee, userEmails);
        if (!assigneeEmail) return;
        notifications[assigneeEmail] = notifications[assigneeEmail] || [];
        notifications[assigneeEmail].push(task);
    });
    return Object.entries(notifications).map(([email, items]) => {
        const subject = `待辦更新提醒 (${displayDate})`;
        const lines = [
            `您好，以下為 ${displayDate} 仍在處理中的待辦事項，請協助更新進度：`,
            "",
        ];
        items.forEach((task) => {
            const title = task.title || "未命名事項";
            const dueDate = task.dueDate || "未設定";
            lines.push(`- ${title}（預計完成：${dueDate}）`);
        });
        lines.push("", "此郵件為系統 On-going 通知，如有更新請至系統填寫。");
        return { to: email, subject, body: lines.join("\n") };
    });
};

const sendEmailJsNotification = async (config, payload) => {
    if (!config?.serviceId || !config?.templateId || !config?.publicKey) {
        throw new Error("尚未完成 EmailJS 設定");
    }
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            service_id: config.serviceId,
            template_id: config.templateId,
            user_id: config.publicKey,
            template_params: {
                to_email: payload.to,
                subject: payload.subject,
                message: payload.body,
                from_name: config.fromName || "Job Management System"
            }
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "EmailJS 發送失敗");
    }
    return true;
};

const shouldSkipLocaleNode = (node) => {
    if (!node || !node.parentElement) return true;
    if (!node.nodeValue || !node.nodeValue.trim()) return true;
    const parent = node.parentElement;
    const tag = parent.tagName;
    if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(tag)) return true;
    if (parent.closest('[contenteditable="true"]')) return true;
    if (parent.closest('[data-locale-ignore="true"]')) return true;
    return false;
};

const applyLocaleToDocument = (locale, converters, originalTextMap, isUpdatingRef) => {
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

const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Async: Could not copy text: ', err);
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
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
};

const extractContentForAI = (htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const text = tempDiv.textContent || tempDiv.innerText || "";
    const images = [];
    const imgTags = tempDiv.getElementsByTagName('img');
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

const exportToCSV = (data, filename, headers) => {
    if (!data || !data.length) return;
    const bom = '\uFEFF';
    const csvContent = [
        headers.map(h => h.label).join(','),
        ...data.map(row => 
        headers.map(h => {
            let val = row[h.key] || '';
            if (h.key === 'content' && typeof val === 'string') val = val.replace(/<[^>]+>/g, '');
            if (typeof val === 'string' && (val.includes(',') || val.includes('\n'))) val = `"${val.replace(/"/g, '""')}"`;
            return val;
        }).join(',')
        )
    ].join('\n');
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const compressImage = (file) => {
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

// --- 1.5 Custom Hooks ---

// useModal Hook - 簡化 Modal 管理
const useModal = () => {
    const [modalConfig, setModalConfig] = useState({ isOpen: false });

    const showModal = (config) => setModalConfig({ isOpen: true, ...config });
    const hideModal = () => setModalConfig({ isOpen: false });

    const showError = (title, content) => showModal({
        type: 'danger',
        title,
        content,
        onConfirm: hideModal,
        confirmText: '關閉',
        onCancel: null
    });

    const showSuccess = (title, content) => showModal({
        type: 'confirm',
        title,
        content,
        onConfirm: hideModal,
        confirmText: '好',
        onCancel: null
    });

    const showConfirm = (title, content, onConfirm) => showModal({
        type: 'danger',
        title,
        content,
        onConfirm: () => { hideModal(); onConfirm(); },
        onCancel: hideModal
    });

    return { modalConfig, showModal, hideModal, showError, showSuccess, showConfirm };
};

// --- 1.6 Permission Management Utilities ---

// 通用權限管理函數
const createPermissionManager = (db, AIVRES_EMAIL_DOMAIN) => {
    const addPermission = async (docPath, email, existingList, rootList = []) => {
        const normalizedEmail = normalizePermissionEmail(email);
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            throw new Error('請輸入使用者帳號');
        }
        const allExisting = [...existingList, ...rootList].map(e => e.toLowerCase());
        if (allExisting.includes(normalizedEmail)) {
            throw new Error('該使用者已有此權限');
        }
        await setDoc(doc(db, ...docPath.split('/')), { list: arrayUnion(normalizedEmail) }, { merge: true });
        return normalizedEmail;
    };

    const removePermission = async (docPath, emailToRemove) => {
        const docRef = doc(db, ...docPath.split('/'));
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            const updatedList = (snapshot.data().list || []).filter(e => e !== emailToRemove);
            await setDoc(docRef, { list: updatedList }, { merge: true });
        }
    };

    return { addPermission, removePermission };
};

// --- 1.7 Error Boundary Component ---

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
                        <div className="p-4 bg-red-100 rounded-full inline-block mb-4">
                            <AlertCircle className="text-red-600" size={48} />
                        </div>
                        <h2 className="text-xl font-bold text-red-700 mb-2">系統發生錯誤</h2>
                        <p className="text-slate-600 mb-4">
                            {this.state.error?.message || '未知錯誤'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            重新載入
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- 2. Base Components (Defined First) ---

const Modal = ({ isOpen, title, content, onConfirm, onCancel, confirmText = '確認', cancelText = '取消', type = 'confirm', children, testId }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" data-testid={testId}>
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
            <div className="p-6 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
                {type === 'danger' && <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertCircle size={24} /></div>}
                {type === 'confirm' && <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Info size={24} /></div>}
                {type === 'ai' && <div className="p-2 bg-purple-100 rounded-full text-purple-600"><Bot size={24} /></div>}
                <h3 className={`text-lg font-bold ${type === 'danger' ? 'text-red-700' : 'text-slate-800'}`}>{title}</h3>
            </div>
            {content && <p className="text-slate-600 text-sm leading-relaxed ml-1 whitespace-pre-wrap">{content}</p>}
            {children}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100 flex-shrink-0">
            {onCancel && <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">{cancelText}</button>}
            <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : type === 'ai' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{confirmText}</button>
            </div>
        </div>
        </div>
    );
};

// 新增: CopyButton Component - 提供視覺回饋
const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        copyToClipboard(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className={`mt-3 flex items-center gap-2 text-sm font-medium transition-colors ${copied ? 'text-green-600' : 'text-purple-600 hover:underline'}`}
        >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '已複製成功！' : '複製報告內容'}
        </button>
    );
};

// 下載 Word 文件功能 (支援 HTML 內容)
const downloadAsWord = (content, filename = 'AI_Report', isHtml = false) => {
    const bodyContent = isHtml ? content : `<div style="white-space: pre-wrap;">${content.replace(/\n/g, '<br>')}</div>`;
    const htmlContent = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>${filename}</title>
            <style>
                body { font-family: '微軟正黑體', 'Microsoft JhengHei', Arial, sans-serif; line-height: 1.8; padding: 30px; color: #333; }
                h1 { font-size: 24px; color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-top: 20px; }
                h2 { font-size: 20px; color: #1e3a8a; margin-top: 18px; }
                h3 { font-size: 16px; color: #374151; margin-top: 14px; }
                p { margin: 10px 0; }
                ul, ol { margin: 10px 0; padding-left: 25px; }
                li { margin: 5px 0; }
                table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
                th { background-color: #f3f4f6; font-weight: bold; }
                blockquote { border-left: 4px solid #6366f1; padding-left: 15px; margin: 10px 0; color: #4b5563; background: #f9fafb; padding: 10px 15px; }
                code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
                pre { background: #f3f4f6; padding: 15px; border-radius: 8px; overflow-x: auto; }
                strong { color: #1f2937; }
                hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
            </style>
        </head>
        <body>
            ${bodyContent}
        </body>
        </html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Markdown 渲染組件
const MarkdownRenderer = ({ content }) => {
    const htmlContent = useMemo(() => {
        if (!content) return '';
        try {
            return marked.parse(content);
        } catch (e) {
            return content;
        }
    }, [content]);

    return (
        <div
            className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-table:text-sm prose-th:bg-slate-100 prose-th:p-2 prose-td:p-2 prose-td:border prose-th:border"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
};

// AI 對話 Modal 組件 (增強版 - 支援日期篩選和 Markdown 渲染)
const AIConversationModal = ({ isOpen, onClose, rawData, geminiApiKey, geminiModel = 'gemini-2.5-flash', dataType = 'tasks', onDateFilter }) => {
    const [userPrompt, setUserPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filteredData, setFilteredData] = useState('');

    // 格式化日期顯示
    const formatDateRange = () => {
        if (!startDate && !endDate) return '';
        const start = startDate ? new Date(startDate).toLocaleDateString('zh-TW') : '';
        const end = endDate ? new Date(endDate).toLocaleDateString('zh-TW') : '';
        if (start && end) return `${start} ~ ${end}`;
        if (start) return `${start} 起`;
        if (end) return `至 ${end}`;
        return '';
    };

    // 根據資料類型設定不同的預設提示詞
    const dateRangeText = formatDateRange();
    const weeklyReportPrompt = dateRangeText
        ? `請根據以下 ${dateRangeText} 期間的工作進展，整理一份給領導的周報。格式要求：\n1. 本周完成事項（按重要性排序，使用條列）\n2. 進行中工作及進度百分比（請使用 Markdown 表格呈現，欄位：事項｜負責人｜進度百分比｜本周進展｜備註）\n3. 下周工作計劃\n4. 需要協調或支援事項\n\n請使用 Markdown 格式，語氣專業簡潔，突出重點成果。標題請標註報告期間。`
        : '請根據以下工作進展，整理一份給領導的周報。格式要求：\n1. 本周完成事項（按重要性排序，使用條列）\n2. 進行中工作及進度百分比（請使用 Markdown 表格呈現，欄位：事項｜負責人｜進度百分比｜本周進展｜備註）\n3. 下周工作計劃\n4. 需要協調或支援事項\n\n請使用 Markdown 格式，語氣專業簡潔，突出重點成果。';

    const defaultPrompts = dataType === 'meetings' ? [
        { label: '會議摘要', prompt: '請根據以下會議記錄，整理出一份專業的會議紀要，包含執行摘要、重點議題討論、關鍵決策、待辦事項。請使用 Markdown 格式輸出。' },
        { label: '行動項目', prompt: '請從以下會議記錄中提取所有待辦事項和行動項目，列出負責人和截止日期。請使用 Markdown 表格格式輸出。' },
        { label: '決策總結', prompt: '請從以下會議記錄中總結所有重要決策和結論。請使用 Markdown 格式輸出。' },
        { label: '報告格式', prompt: '請將以下會議記錄整理成適合發送給主管的報告格式，語氣專業且簡潔。請使用 Markdown 格式輸出。' }
    ] : [
        { label: '工作進度總結', prompt: '請根據以下工作內容，整理出一份專業的工作進度報告。格式要求：\n1. 核心成果（條列）\n2. 進行中工作（使用 Markdown 表格呈現，欄位：事項｜負責人｜進度百分比｜本周進展｜備註）\n3. 風險與阻礙\n4. 下階段計劃\n\n請使用 Markdown 格式輸出。' },
        { label: '周報', prompt: weeklyReportPrompt },
        { label: '會議報告', prompt: '請將以下工作內容整理成適合在會議中報告的格式，重點突出、簡潔明瞭。請使用 Markdown 格式輸出。' },
        { label: '郵件摘要', prompt: '請將以下工作內容整理成適合發送給主管的工作更新郵件內容，語氣專業且簡潔。請使用 Markdown 格式輸出。' },
        { label: '風險分析', prompt: '請分析以下工作內容中的風險和問題，並提供建議的解決方案。請使用 Markdown 格式輸出，使用表格呈現風險評估。' }
    ];

    // 日期篩選邏輯
    // 工作任務：根據進展欄位內的日期篩選，若進展無符合日期的內容則不納入總結
    // 會議記錄：按會議日期篩選
    useEffect(() => {
        if (!rawData || !Array.isArray(rawData)) {
            setFilteredData(typeof rawData === 'string' ? rawData : '');
            return;
        }

        // 格式化資料為文字
        if (dataType === 'meetings') {
            // 會議記錄：按會議日期篩選
            let filtered = rawData;
            if (startDate || endDate) {
                filtered = rawData.filter(item => {
                    const itemDate = item.date;
                    if (!itemDate) return false;
                    const d = new Date(itemDate);
                    if (startDate && d < new Date(startDate)) return false;
                    if (endDate && d > new Date(endDate)) return false;
                    return true;
                });
            }
            const dataStr = filtered.map((m, index) => {
                const content = m.content ? m.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '無內容';
                return `會議${index + 1}：主題=${m.topic}；日期=${m.date}；主持人=${m.host}；分類=${m.category || '未分類'}；參會人員=${m.attendees || '未記錄'}；內容=${content.substring(0, 500)}`;
            }).join('\n');
            setFilteredData(dataStr);
        } else {
            // 工作任務：根據進展欄位內的日期篩選
            // 如果設定了日期範圍，只保留有符合日期進展的任務
            const tasksWithProgress = rawData.map(t => {
                const filteredProgress = extractProgressByDateRange(t.progress, startDate, endDate);
                return { task: t, filteredProgress };
            }).filter(item => {
                // 如果沒有設定日期範圍，保留所有任務
                if (!startDate && !endDate) return true;
                // 如果設定了日期範圍，只保留有符合日期進展的任務
                return item.filteredProgress && item.filteredProgress.trim() !== '';
            });

            const dataStr = tasksWithProgress.map((item, index) => {
                const t = item.task;
                const assignee = t.assignee || t.createdByEmail || 'Unknown';
                const progress = item.filteredProgress || '未提供';
                return `項目${index + 1}：事項=${t.title}；負責人=${assignee}；來源=${t.source || '未提供'}；交辦日=${t.assignedDate || '未提供'}；截止日=${t.dueDate || '未提供'}；狀態=${t.status || '未提供'}；進度=${progress}；延遲原因=${t.delayReason || '無'}`;
            }).join('\n');
            setFilteredData(dataStr);
        }
    }, [rawData, startDate, endDate, dataType]);

    const handleSubmit = async () => {
        if (!userPrompt.trim()) {
            setError('請輸入提示詞');
            return;
        }
        if (!geminiApiKey) {
            setError('尚未設定 Gemini API Key，請至系統設定填寫。');
            return;
        }
        if (!filteredData.trim()) {
            setError('篩選後無資料可供分析，請調整日期範圍。');
            return;
        }
        setIsLoading(true);
        setError('');
        setAiResponse('');

        const fullPrompt = [
            "### 用戶指令",
            userPrompt,
            "",
            "### 重要提示",
            "請務必使用 Markdown 格式輸出，包含適當的標題(#, ##, ###)、條列(-, *)、表格、粗體(**text**)等格式，使報告結構清晰、易於閱讀。",
            "",
            dataType === 'meetings' ? "### 會議資料" : "### 工作資料",
            filteredData
        ].join('\n');

        try {
            const resultRaw = await callGeminiAI([{ text: fullPrompt }], geminiApiKey, geminiModel);
            // 不使用 cleanAIResponse，保留 Markdown 格式
            setAiResponse(resultRaw);
        } catch (e) {
            setError(e.message || '生成失敗，請稍後再試');
        }
        setIsLoading(false);
    };

    const handleDownloadWord = () => {
        if (aiResponse) {
            // 將 Markdown 轉換為 HTML 後再下載
            const htmlContent = marked.parse(aiResponse);
            downloadAsWord(htmlContent, dataType === 'meetings' ? 'AI_會議報告' : 'AI_工作報告', true);
        }
    };

    const handleClose = () => {
        setUserPrompt('');
        setAiResponse('');
        setError('');
        setStartDate('');
        setEndDate('');
        onClose();
    };

    // 計算篩選後的資料數量 (必須在 return 之前，遵守 React Hooks 規則)
    const dataCount = useMemo(() => {
        if (!Array.isArray(rawData)) return 0;
        if (!startDate && !endDate) return rawData.length;

        if (dataType === 'meetings') {
            // 會議記錄：按會議日期篩選
            return rawData.filter(item => {
                const itemDate = item.date;
                if (!itemDate) return false;
                const d = new Date(itemDate);
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            }).length;
        } else {
            // 工作任務：根據進展欄位內的日期篩選
            return rawData.filter(t => {
                const filteredProgress = extractProgressByDateRange(t.progress, startDate, endDate);
                return filteredProgress && filteredProgress.trim() !== '';
            }).length;
        }
    }, [rawData, startDate, endDate, dataType]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
                <div className="p-6 flex-shrink-0 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-full text-purple-600"><Bot size={24} /></div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">AI 智能對話總結</h3>
                            <p className="text-xs text-slate-500">{dataType === 'meetings' ? '會議記錄分析' : '工作待辦分析'}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* 日期範圍篩選 */}
                    <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                            <Calendar size={14} /> 日期範圍篩選
                        </label>
                        <p className="text-xs text-slate-500 mb-3">篩選進展欄位中指定日期範圍的內容（偵測進展文字中的日期格式，如 1/5、2025/1/12）</p>
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">從</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">至</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            >
                                清除
                            </button>
                            <span className="text-sm text-slate-500 ml-auto">
                                已選取 <span className="font-bold text-purple-600">{dataCount}</span> 筆資料
                            </span>
                        </div>
                    </div>

                    {/* 快速選擇提示詞 */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">快速選擇提示詞</label>
                        <div className="flex flex-wrap gap-2">
                            {defaultPrompts.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setUserPrompt(item.prompt)}
                                    className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition border border-purple-200"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 提示詞輸入 */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">輸入提示詞 <span className="text-red-500">*</span></label>
                        <textarea
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            placeholder="請輸入您希望 AI 如何處理資料的指令..."
                            className="w-full p-3 border border-slate-300 rounded-lg min-h-[80px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* 錯誤訊息 */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* 送出按鈕 */}
                    <div className="mb-4">
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || dataCount === 0}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    AI 正在思考中...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    生成報告
                                </>
                            )}
                        </button>
                    </div>

                    {/* AI 回應 - Markdown 渲染 */}
                    {aiResponse && (
                        <div className="mt-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">AI 回應</label>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 max-h-[40vh] overflow-y-auto">
                                <MarkdownRenderer content={aiResponse} />
                            </div>
                            <div className="flex gap-3 mt-3">
                                <CopyButton text={aiResponse} />
                                <button
                                    onClick={handleDownloadWord}
                                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                                >
                                    <Download size={16} />
                                    下載 Word
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100 flex-shrink-0">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
};

const NavButton = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>{icon}<span className="font-medium">{label}</span></button>
);

const ContentEditor = ({ value, onChange }) => {
    const editableRef = useRef(null);
    useEffect(() => {
        if (editableRef.current && editableRef.current.innerHTML !== value) {
            editableRef.current.innerHTML = value || '';
        }
    }, [value]);
    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                const base64 = await compressImage(file);
                if (base64.length > 800 * 1024) { alert("圖片過大"); return; }
                document.execCommand('insertImage', false, base64);
            }
        }
    };
    const handleInput = (e) => onChange(e.currentTarget.innerHTML);
    return (
        <div className="w-full p-3 border border-slate-300 rounded min-h-[150px] max-h-[400px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-emerald-500 prose prose-sm max-w-none bg-slate-50" contentEditable ref={editableRef} onInput={handleInput} onPaste={handlePaste} data-placeholder="請輸入會議內容，可直接貼上圖片..." />
    );
};

// --- 3. Sub-Components (Tasks & Meetings) ---

const TaskForm = ({ initialData, onSave, onCancel, taskSources, taskStatuses, assigneeOptions, teams = [] }) => {
    const [formData, setFormData] = useState({
        title: '', assignee: '', status: 'Pending', source: '', assignedDate: new Date().toISOString().split('T')[0], dueDate: '', delayReason: '', progress: '', teamId: '', ...initialData
    });
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // 根據選擇的團隊過濾負責人選項
    const filteredAssignees = useMemo(() => {
        if (!formData.teamId) return assigneeOptions || [];
        const selectedTeam = teams.find(t => t.id === formData.teamId);
        if (!selectedTeam) return assigneeOptions || [];
        const teamEmails = [...getTeamLeaders(selectedTeam), ...(selectedTeam.members || [])];
        const teamPrefixes = teamEmails.map(e => formatEmailPrefix(e));
        return (assigneeOptions || []).filter(a => teamPrefixes.includes(a));
    }, [formData.teamId, teams, assigneeOptions]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                        {initialData ? <Edit2 size={20} className="text-blue-600" /> : <Plus size={20} className="text-green-600" />}
                        {initialData ? '編輯待辦事項' : '新增待辦事項'}
                    </h3>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">事項內容 <span className="text-red-500">*</span></label><input name="title" value={formData.title} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required /></div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">所屬團隊 <span className="text-red-500">*</span></label>
                            {teams.length > 0 ? (
                                <select name="teamId" value={formData.teamId} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required>
                                    <option value="" disabled>請選擇團隊</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            ) : (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm text-amber-800">您尚未被加入任何團隊</p>
                                    <p className="text-xs text-amber-600 mt-1">請聯繫 <strong>Doris Kuo</strong> 或 <strong>Team Leader</strong></p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">負責人 <span className="text-red-500">*</span></label>
                            <select name="assignee" value={formData.assignee} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" data-testid="assignee-input" required>
                                <option value="">請選擇負責人</option>
                                {filteredAssignees.map((assignee) => (
                                    <option key={assignee} value={assignee}>{assignee}</option>
                                ))}
                            </select>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">來源 <span className="text-red-500">*</span></label><select name="source" value={formData.source} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required><option value="" disabled>請選擇來源</option>{taskSources.map((s, i) => <option key={i} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">狀態 <span className="text-red-500">*</span></label><select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required><option value="" disabled>請選擇狀態</option>{taskStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">交辦日期 <span className="text-red-500">*</span></label><input type="date" name="assignedDate" value={formData.assignedDate} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">預計完成 <span className="text-red-500">*</span></label><input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required /></div>
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">進展更新 <span className="text-red-500">*</span></label><p className="text-xs text-red-500 mb-1">務必按照日期+內容的格式填寫，如：1/1 完成OOXX</p><textarea name="progress" value={formData.progress} onChange={handleChange} rows="3" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="例：1/20 完成需求分析" required /></div>
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-slate-400">延遲原因 (選填)</label><input name="delayReason" value={formData.delayReason} onChange={handleChange} className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg" placeholder="非必填" /></div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg transition font-medium">取消</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm"><Save size={18} /> 儲存</button>
                </div>
            </div>
        </div>
    );
};

const TaskRow = ({ task, onEdit, onDelete }) => {
    const getStatusColor = (status) => {
        const s = status.toLowerCase();
        if (s.includes('done') || s.includes('complete') || s.includes('完成')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('on-going') || s.includes('process') || s.includes('進行')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s.includes('pending') || s.includes('wait') || s.includes('待')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };
    return (
        <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(task.status)}`}>{task.status}</span></td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{task.source || '-'}</td>
        <td className="px-6 py-4">
            <div className="font-medium text-slate-800 max-w-xs truncate" title={task.title}>{task.title}</div>
            {task.createdByEmail && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><User size={10} /> {formatEmailPrefix(task.createdByEmail)}</div>}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">{task.assignee || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap">{task.assignedDate}</td>
        <td className="px-6 py-4 whitespace-nowrap"><span className={task.dueDate && new Date(task.dueDate) < new Date() && !task.status.toLowerCase().includes('done') ? 'text-red-600 font-bold' : ''}>{task.dueDate || '-'}</span></td>
        <td className="px-6 py-4 max-w-xs"><div className="flex flex-col gap-1">{task.progress && <div className="text-xs text-slate-600 truncate" title={task.progress}>{task.progress}</div>}{task.delayReason && (<div className="flex items-center gap-1 text-xs text-red-500 truncate" title={task.delayReason}><AlertCircle size={12} /> {task.delayReason}</div>)}</div></td>
        <td className="px-6 py-4 text-right whitespace-nowrap"><div className="flex justify-end gap-2"><button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Edit2 size={16} /></button><button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16} /></button></div></td>
        </tr>
    );
};

const MeetingForm = ({ initialData, onSave, onCancel, categories, teams = [] }) => {
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], host: '', attendees: '', topic: '', content: '', category: categories[0] || '', teamId: '', ...initialData });
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleContentChange = (newContent) => setFormData(prev => ({ ...prev, content: newContent }));
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 mb-6">
        <h3 className="font-bold text-lg mb-4 text-slate-700">{initialData ? '編輯會議記錄' : '新增會議記錄'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">主題 <span className="text-red-500">*</span></label><input name="topic" value={formData.topic} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
            <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">分類 <span className="text-red-500">*</span></label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded" required><option value="" disabled>請選擇分類</option>{categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">日期 <span className="text-red-500">*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">主持人 <span className="text-red-500">*</span></label><input name="host" value={formData.host} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">所屬團隊</label>{teams.length > 0 ? (<select name="teamId" value={formData.teamId} onChange={handleChange} className="w-full p-2 border rounded"><option value="">不指定團隊</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>) : (<div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">尚未加入團隊，請聯繫 Doris Kuo 或 Team Leader</div>)}</div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">參會人員 <span className="text-red-500">*</span></label><input name="attendees" value={formData.attendees} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center justify-between"><span>內容 (支援圖片貼上) <span className="text-red-500">*</span></span><span className="text-[10px] font-normal text-slate-400 flex items-center gap-1"><ImageIcon size={10}/> 貼上截圖會自動壓縮</span></label><ContentEditor value={formData.content} onChange={handleContentChange} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6"><button onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">取消</button><button onClick={() => onSave(formData)} className="px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2"><Save size={18} /> 儲存</button></div>
        </div>
    );
};

const MeetingRow = ({ meeting, onEdit, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden group">
        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col items-center justify-center bg-emerald-50 text-emerald-700 w-16 h-16 rounded-lg border border-emerald-100 flex-shrink-0"><span className="text-xs font-bold uppercase">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span><span className="text-xl font-bold">{new Date(meeting.date).getDate()}</span></div>
            <div><div className="flex items-center gap-2">{meeting.category && <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">{meeting.category}</span>}<h3 className="font-bold text-slate-800">{meeting.topic}</h3></div><p className="text-sm text-slate-500 flex gap-2 mt-1"><span>{meeting.host}</span><span>•</span><span className="line-clamp-1 max-w-[200px]">{meeting.attendees}</span></p>{meeting.createdByEmail && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><User size={10} /> {formatEmailPrefix(meeting.createdByEmail)}</div>}</div>
            </div>
            <div className="flex items-center gap-4"><ChevronRight size={20} className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} /></div>
        </div>
        {expanded && (
            <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50">
            <div className="mt-4 text-sm text-slate-700 leading-relaxed bg-white p-4 rounded border border-slate-200 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: meeting.content || "無詳細內容" }} />
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3"><button onClick={onEdit} className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-600">編輯</button><button onClick={onDelete} className="px-3 py-1.5 text-sm bg-red-50 border border-red-200 rounded hover:bg-red-100 text-red-600">刪除</button></div>
            </div>
        )}
        </div>
    );
};

// --- 4. Page Components (AuthPage Defined Here) ---

const AuthPage = ({ auth, error, connectionStatus }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [emailPrefix, setEmailPrefix] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [resetError, setResetError] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('oobCode');
        if (code) {
            setResetCode(code);
            setShowForgot(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAuthError('');
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const registerEmail = emailPrefix.trim().toLowerCase();
                if (!registerEmail) {
                    setAuthError('請輸入 Email 信箱');
                    setLoading(false);
                    return;
                }
                if (!registerEmail.includes('@')) {
                    setAuthError('請輸入完整 Email 地址');
                    setLoading(false);
                    return;
                }
                await createUserWithEmailAndPassword(auth, registerEmail, password);
            }
        } catch (err) {
            console.error("Auth Error:", err);
            let msg = err.message;
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') msg = '帳號或密碼錯誤';
            if (err.code === 'auth/email-already-in-use') msg = '此 Email 已被註冊';
            if (err.code === 'auth/weak-password') msg = '密碼太短 (至少6位)';
            if (err.code === 'auth/operation-not-allowed') msg = '系統錯誤：請聯繫管理員開啟 Email 登入功能';
            setAuthError(msg);
        }
        setLoading(false);
    };

    const handleSendResetEmail = async () => {
        if (!resetEmail) {
            setResetError('請輸入 Email 信箱');
            return;
        }
        setResetError('');
        setResetMessage('');
        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetMessage('已寄送重設密碼信件，請至信箱完成變更密碼。');
        } catch (err) {
            console.error("Reset Email Error:", err);
            let msg = err.message;
            if (err.code === 'auth/user-not-found') msg = '此 Email 尚未註冊';
            if (err.code === 'auth/invalid-email') msg = 'Email 格式不正確';
            setResetError(msg);
        }
        setResetLoading(false);
    };

    const handleConfirmReset = async (e) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            setResetError('請輸入新密碼並確認');
            return;
        }
        if (newPassword !== confirmPassword) {
            setResetError('兩次輸入的密碼不一致');
            return;
        }
        setResetError('');
        setResetMessage('');
        setResetLoading(true);
        try {
            await verifyPasswordResetCode(auth, resetCode);
            await confirmPasswordReset(auth, resetCode, newPassword);
            setResetMessage('密碼已更新，請使用新密碼登入。');
            setResetCode('');
            setShowForgot(false);
            setIsLogin(true);
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error("Confirm Reset Error:", err);
            let msg = err.message;
            if (err.code === 'auth/expired-action-code') msg = '重設連結已過期，請重新申請';
            if (err.code === 'auth/invalid-action-code') msg = '重設連結無效，請重新申請';
            if (err.code === 'auth/weak-password') msg = '密碼太短 (至少6位)';
            setResetError(msg);
        }
        setResetLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-slate-900 p-8 text-center">
            <div className="inline-flex p-3 bg-blue-600 rounded-full mb-4 shadow-lg">
                <Database size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">工作紀錄中心</h1>
            <p className="text-slate-400 text-sm">請登入以存取您的工作資料</p>
            <p className="text-xs text-slate-500 mt-2" data-testid="firebase-status-auth">Firebase 連線狀態：{connectionStatus}</p>
            </div>
            <div className="p-8">
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex gap-2"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" />{error}</div>}
            {!showForgot && (
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email 信箱</label>
                    <input
                        type="email"
                        required
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        placeholder={isLogin ? "" : "輸入完整 Email 地址"}
                        value={isLogin ? email : emailPrefix}
                        onChange={(e) => isLogin ? setEmail(e.target.value) : setEmailPrefix(e.target.value)}
                        data-testid="login-email"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
                    <input
                        type="password"
                        required
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        data-testid="login-password"
                    />
                </div>
                {authError && <div className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={14} /> {authError}</div>}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="login-submit"
                >
                    {loading && <Loader2 size={18} className="animate-spin" />}{isLogin ? '登入系統' : '註冊帳號'}
                </button>
                {isLogin && <button type="button" onClick={() => { setShowForgot(true); setAuthError(''); setResetMessage(''); setResetError(''); }} className="w-full text-sm text-blue-600 hover:underline">忘記密碼？</button>}
                </form>
            )}
            {showForgot && (
                <form onSubmit={resetCode ? handleConfirmReset : (e) => { e.preventDefault(); handleSendResetEmail(); }} className="space-y-4">
                {!resetCode && (
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">重設信箱</label>
                    <input type="email" required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                    <p className="mt-2 text-xs text-slate-500">系統將寄出重設密碼信件。</p>
                    </div>
                )}
                {resetCode && (
                    <>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">新密碼</label>
                        <input type="password" required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">確認新密碼</label>
                        <input type="password" required className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                    </>
                )}
                {resetMessage && <div className="text-emerald-600 text-sm flex items-center gap-1"><CheckCircle2 size={14} /> {resetMessage}</div>}
                {resetError && <div className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={14} /> {resetError}</div>}
                <button type="submit" disabled={resetLoading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50">{resetLoading && <Loader2 size={18} className="animate-spin" />}{resetCode ? '更新密碼' : '寄送重設信件'}</button>
                <button type="button" onClick={() => { setShowForgot(false); setResetMessage(''); setResetError(''); setResetCode(''); }} className="w-full text-sm text-slate-500 hover:underline">返回登入</button>
                </form>
            )}
            <div className="mt-6 text-center text-sm text-slate-500">
                {isLogin ? '還沒有帳號？' : '已經有帳號了？'}
                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setAuthError('');
                        setEmail('');
                        setEmailPrefix('');
                    }}
                    className="ml-2 text-blue-600 font-bold hover:underline"
                >
                    {isLogin ? '立即註冊' : '返回登入'}
                </button>
            </div>
            </div>
        </div>
        </div>
    );
};

const Dashboard = ({ db, user, canAccessAll, isAdmin }) => {
    const [taskStats, setTaskStats] = useState({ total: 0, byStatus: {}, bySource: {}, byAssignee: {}, byAssigneeStatus: {}, statusOrder: [] });
    const [meetingStats, setMeetingStats] = useState({ total: 0, byCategory: {} });

    useEffect(() => {
        if (!db || !user) return;
        const qTasks = canAccessAll 
            ? query(collectionGroup(db, 'tasks')) 
            : query(collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'tasks'));
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            let t = 0; let sources = {}; let statuses = {}; let assignees = {}; let assigneeStatuses = {};
            snapshot.forEach(doc => {
                const data = doc.data(); t++;
                const status = data.status || '未定義'; statuses[status] = (statuses[status] || 0) + 1;
                const src = data.source || '未分類'; sources[src] = (sources[src] || 0) + 1;
                const owner = data.assignee || data.createdByEmail || '未指定'; assignees[owner] = (assignees[owner] || 0) + 1;
                if (!assigneeStatuses[owner]) { assigneeStatuses[owner] = {}; }
                assigneeStatuses[owner][status] = (assigneeStatuses[owner][status] || 0) + 1;
            });
            const statusOrder = Object.entries(statuses).sort((a, b) => b[1] - a[1]).map(([status]) => status);
            setTaskStats({ total: t, byStatus: statuses, bySource: sources, byAssignee: assignees, byAssigneeStatus: assigneeStatuses, statusOrder });
        });
        const qMeetings = canAccessAll
            ? query(collectionGroup(db, 'meetings'))
            : query(collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'meetings'));
        const unsubMeetings = onSnapshot(qMeetings, (snapshot) => {
            let t = 0; let cats = {};
            snapshot.forEach(doc => {
                const data = doc.data(); t++;
                const c = data.category || '未分類'; cats[c] = (cats[c] || 0) + 1;
            });
            setMeetingStats({ total: t, byCategory: cats });
        });
        return () => { unsubTasks(); unsubMeetings(); };
    }, [db, user, canAccessAll]);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-2"><h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><LayoutDashboard className="text-blue-600"/> 數據看板</h2>{canAccessAll && <span className={`text-xs px-2 py-1 rounded-full font-bold ${isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{isAdmin ? 'Admin View (All Data)' : 'Editor View (All Data)'}</span>}</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><div className="text-slate-500 text-sm font-bold uppercase mb-2">總待辦事項</div><div className="text-4xl font-bold text-slate-800">{taskStats.total}</div></div>
                {Object.entries(taskStats.byStatus).slice(0, 3).map(([status, count], i) => {
                    const colors = ['bg-yellow-50 border-yellow-200 text-yellow-800', 'bg-blue-50 border-blue-200 text-blue-800', 'bg-green-50 border-green-200 text-green-800'];
                    return (<div key={status} className={`p-6 rounded-xl shadow-sm border ${colors[i % colors.length]}`}><div className="text-sm font-bold uppercase mb-2 opacity-80">{status}</div><div className="text-4xl font-bold">{count}</div></div>);
                })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={20}/> 待辦事項來源分析</h3>
                    <div className="space-y-3">{Object.keys(taskStats.bySource).length === 0 ? <p className="text-slate-400 text-sm">暫無資料</p> : Object.entries(taskStats.bySource).map(([src, count]) => (<div key={src}><div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{src}</span><span className="font-bold text-slate-800">{count}</span></div><div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / taskStats.total) * 100}%` }}></div></div></div>))}</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={20}/> 負責人待辦統計</h3>
                    <div className="space-y-3">
                        {Object.keys(taskStats.byAssignee).length === 0 ? (
                            <p className="text-slate-400 text-sm">暫無資料</p>
                        ) : (
                            Object.entries(taskStats.byAssignee)
                                .sort((a, b) => b[1] - a[1])
                                .map(([name, count]) => {
                                    const assigneeStatuses = taskStats.byAssigneeStatus[name] || {};
                                    const statusList = taskStats.statusOrder.length ? taskStats.statusOrder : Object.keys(assigneeStatuses);
                                    return (
                                        <div key={name} className="text-sm p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-700 font-medium truncate">{name}</span>
                                                <span className="font-mono font-bold text-slate-700">{count}</span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {statusList.filter((status) => assigneeStatuses[status]).map((status) => (
                                                    <span key={status} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                        {status} {assigneeStatuses[status]}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChart size={20}/> 會議類型統計</h3>
                    <div className="flex items-center justify-between mb-6"><div><div className="text-3xl font-bold text-slate-800">{meetingStats.total}</div><div className="text-xs text-slate-500">總會議場次</div></div><div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><Users size={24}/></div></div>
                    <div className="space-y-2">{Object.keys(meetingStats.byCategory).length === 0 ? <p className="text-slate-400 text-sm">暫無資料</p> : Object.entries(meetingStats.byCategory).map(([cat, count]) => (<div key={cat} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>{cat}</span><span className="font-mono font-bold text-slate-700">{count}</span></div>))}</div>
                </div>
            </div>
        </div>
    );
};

const TaskManager = ({ db, user, canAccessAll, isAdmin, testConfig, geminiApiKey, geminiModel, canUseAI, teams = [] }) => {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    const [taskSources, setTaskSources] = useState(['Email', 'Meeting', 'Chat', 'Other']);
    const [taskStatuses, setTaskStatuses] = useState(['Pending', 'On-going', 'Done']);
    const [assigneeOptions, setAssigneeOptions] = useState([]);
    const isRootAdmin = ROOT_ADMINS.includes(user?.email);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiReport, setAiReport] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterSource, setFilterSource] = useState('All');
    const [filterAssignee, setFilterAssignee] = useState('All');
    const [filterTeam, setFilterTeam] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAIModal, setShowAIModal] = useState(false);

    // Leader 相關狀態
    const isLeader = useMemo(() => checkIsLeader(user, teams), [user, teams]);
    const teamMemberEmails = useMemo(() => getLeaderTeamMembers(user, teams), [user, teams]);

    // 判斷是否為普通成員（非 Admin/Editor/Leader）
    const isRegularMember = !canAccessAll && !isLeader;

    // 計算用戶可選擇的團隊（Admin/Editor 可看全部，其他人只能選自己所屬的團隊）
    const userSelectableTeams = useMemo(() => {
        if (canAccessAll) return teams; // Admin/Editor 可選所有團隊
        if (!user?.email) return [];
        const userEmail = user.email.toLowerCase();
        return teams.filter(team => {
            const leaders = getTeamLeaders(team).map(l => l.toLowerCase());
            const members = (team.members || []).map(m => m.toLowerCase());
            return leaders.includes(userEmail) || members.includes(userEmail);
        });
    }, [canAccessAll, user, teams]);

    // Leader 篩選用的團隊列表（只有自己所屬的團隊）
    const filterableTeams = useMemo(() => {
        if (canAccessAll) return teams; // Admin/Editor 可選所有團隊
        // Leader 和普通成員只能篩選自己所屬的團隊
        return userSelectableTeams;
    }, [canAccessAll, teams, userSelectableTeams]);

    // Leader 篩選用的負責人列表（只有自己所屬團隊的成員）
    const filterableAssignees = useMemo(() => {
        if (canAccessAll) return assigneeOptions; // Admin/Editor 可選所有負責人
        if (!user?.email) return [];
        // Leader 只能篩選自己所屬團隊的成員
        const userEmail = user.email.toLowerCase();
        const allowedEmails = new Set();
        userSelectableTeams.forEach(team => {
            const leaders = getTeamLeaders(team);
            const members = team.members || [];
            leaders.forEach(l => allowedEmails.add(formatEmailPrefix(l)));
            members.forEach(m => allowedEmails.add(formatEmailPrefix(m)));
        });
        return assigneeOptions.filter(a => allowedEmails.has(a));
    }, [canAccessAll, user, assigneeOptions, userSelectableTeams]);

    useEffect(() => {
        if (!db || !user) return;

        // 所有用戶都使用全域查詢，以便能看到被指派的任務
        const q = query(collectionGroup(db, 'tasks'));
        const userEmailPrefix = formatEmailPrefix(user.email);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(doc => ({ id: doc.id, path: doc.ref.path, ...doc.data() }));

            // 非管理員/編輯者需要篩選
            if (!canAccessAll) {
                if (isLeader && teamMemberEmails.length > 0) {
                    // Leader: 只能看到自己的任務 + 團隊成員的任務
                    // 不能看到其他 Leader 建立的任務（即使指派給自己的成員）
                    data = data.filter(task => {
                        const isOwnTask = task.createdByEmail === user.email;
                        const isAssignedToMe = task.assignee === userEmailPrefix;
                        const isCreatedByMember = teamMemberEmails.includes(task.createdByEmail);
                        const isAssignedToMember = teamMemberEmails.map(e => formatEmailPrefix(e)).includes(task.assignee);

                        // 自己建立的任務
                        if (isOwnTask) return true;
                        // 指派給自己的任務（只有當建立者是自己或成員時）
                        if (isAssignedToMe && (isOwnTask || isCreatedByMember)) return true;
                        // 成員建立的任務
                        if (isCreatedByMember) return true;
                        // 自己建立並指派給成員的任務
                        if (isOwnTask && isAssignedToMember) return true;

                        return false;
                    });
                } else {
                    // 一般用戶: 自己建立的 + 被指派給自己的任務
                    data = data.filter(task =>
                        task.createdByEmail === user.email ||
                        task.assignee === userEmailPrefix
                    );
                }
            }

            data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setTasks(data);
        }, (error) => console.error("Error tasks:", error));
        return () => unsubscribe();
    }, [db, user, canAccessAll, isLeader, teamMemberEmails]);

    useEffect(() => {
        if (!db) return;
        const settingsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) { const data = docSnap.data(); if (data.taskSources) setTaskSources(data.taskSources); if (data.taskStatuses) setTaskStatuses(data.taskStatuses); }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (testConfig?.enabled) {
            const params = new URLSearchParams(window.location.search);
            const rawAssignees = params.get('testAssignees') || '';
            const parsed = rawAssignees
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            const uniqueAssignees = Array.from(new Set(parsed)).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
            setAssigneeOptions(uniqueAssignees);
            return;
        }
        if (!db) return;
        const usersRef = collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users');
        const q = query(usersRef, orderBy('lastSeen', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const options = snapshot.docs
                    .map((docSnap) => docSnap.data()?.email)
                    .filter(Boolean)
                    .map((email) => formatEmailPrefix(email));
                const uniqueOptions = Array.from(new Set(options)).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
                setAssigneeOptions(uniqueOptions);
            },
            (error) => console.error("Error assignees:", error)
        );
        return () => unsubscribe();
    }, [db, testConfig?.enabled]);

    useEffect(() => {
        let res = tasks;
        if (filterStatus !== 'All') { res = res.filter(t => t.status === filterStatus); }
        if (filterSource !== 'All') { res = res.filter(t => t.source === filterSource); }
        if (filterAssignee !== 'All') { res = res.filter(t => t.assignee === filterAssignee || formatEmailPrefix(t.createdByEmail) === filterAssignee); }
        if (filterTeam !== 'All') { res = res.filter(t => t.teamId === filterTeam); }
        if (searchQuery.trim()) { const lowerQ = searchQuery.toLowerCase(); res = res.filter(t => t.title.toLowerCase().includes(lowerQ) || (t.assignee && t.assignee.toLowerCase().includes(lowerQ)) || (t.createdByEmail && t.createdByEmail.toLowerCase().includes(lowerQ))); }
        setFilteredTasks(res);
    }, [tasks, filterStatus, filterSource, filterAssignee, filterTeam, searchQuery]);

    const handleGenerateReport = () => {
        if (!filteredTasks.length) {
            setModalConfig({ isOpen: true, type: 'confirm', title: '無資料', content: "目前列表為空。", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            return;
        }
        setShowAIModal(true);
    };

    const handleSave = async (formData) => {
        if (!formData.title?.trim() || !formData.teamId || !formData.assignee?.trim() || !formData.source || !formData.status || !formData.assignedDate || !formData.dueDate || !formData.progress?.trim()) {
            setModalConfig({ isOpen: true, type: 'danger', title: '驗證錯誤', content: "請填寫所有必填欄位", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            return;
        }
        try {
        if (formData.id && formData.path) {
            const docRef = doc(db, formData.path);
            await updateDoc(docRef, { ...formData, updatedAt: serverTimestamp() });
        } else {
            const collectionRef = collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'tasks');
            await addDoc(collectionRef, { ...formData, updatedAt: serverTimestamp(), createdAt: serverTimestamp(), createdByEmail: user.email });
        }
        setIsEditing(false); setCurrentTask(null);
        } catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };

    const confirmDelete = (task) => {
        setModalConfig({ isOpen: true, type: 'danger', title: '確認刪除', content: '確定要刪除此項目？', onConfirm: () => executeDelete(task), onCancel: () => setModalConfig({ isOpen: false }) });
    };

    const executeDelete = async (task) => {
        setModalConfig({ isOpen: false });
        try {
        if (task.path) { await deleteDoc(doc(db, task.path)); } else { await deleteDoc(doc(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'tasks', task.id)); }
        } catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };

    const handleExport = () => {
        const headers = [
            {key:'status',label:'狀態'},
            {key:'source',label:'來源'},
            {key:'title',label:'事項'},
            {key:'assignee',label:'負責人'},
            {key:'createdByEmail',label:'建立者'},
            {key:'assignedDate',label:'交辦日期'},
            {key:'dueDate',label:'預計完成'},
            {key:'progress',label:'進度'},
            {key:'delayReason',label:'延遲原因'}
        ];
        exportToCSV(filteredTasks, 'WorkTasks', headers);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
        <Modal {...modalConfig} />
        <AIConversationModal
            isOpen={showAIModal}
            onClose={() => setShowAIModal(false)}
            rawData={filteredTasks}
            geminiApiKey={geminiApiKey}
            geminiModel={geminiModel}
            dataType="tasks"
        />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2"><h2 className="text-2xl font-bold text-slate-800">工作待辦事項</h2>{canAccessAll && <span className={`text-xs px-2 py-1 rounded-full font-bold ${isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{isAdmin ? 'Admin View' : 'Editor View'}</span>}</div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm w-full sm:w-auto"><Search size={16} className="text-slate-400" /><input className="outline-none text-sm w-full sm:w-32" placeholder="搜尋..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm w-full sm:w-auto"><Filter size={16} className="text-slate-400" /><select className="outline-none text-sm w-full sm:w-24 bg-transparent" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="All">全部狀態</option>{taskStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                {!isRegularMember && <select className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm text-sm w-full sm:w-auto" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}><option value="All">全部來源</option>{taskSources.map(s => <option key={s} value={s}>{s}</option>)}</select>}
                {!isRegularMember && <select className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm text-sm w-full sm:w-auto" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}><option value="All">全部負責人</option>{filterableAssignees.map(a => <option key={a} value={a}>{a}</option>)}</select>}
                {!isRegularMember && <select className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm text-sm w-full sm:w-auto" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}><option value="All">全部團隊</option>{filterableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
                {(isAdmin || canUseAI) && <button onClick={handleGenerateReport} className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition shadow-sm w-full sm:w-auto">{aiLoading ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} />} AI 總結</button>}
                <button onClick={handleExport} className="flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm w-full sm:w-auto"><Download size={18} /> 匯出</button>
                <button onClick={() => { setCurrentTask(null); setIsEditing(true); }} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-md w-full sm:w-auto"><Plus size={18} /> 新增</button>
            </div>
        </div>
        {isEditing && (
            <TaskForm
                initialData={currentTask}
                taskSources={taskSources}
                taskStatuses={taskStatuses}
                assigneeOptions={assigneeOptions}
                teams={userSelectableTeams}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
            />
        )}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                <tr><th className="px-6 py-3">狀態</th><th className="px-6 py-3">來源</th><th className="px-6 py-3 min-w-[200px]">事項內容 (建立者)</th><th className="px-6 py-3">負責人</th><th className="px-6 py-3">交辦日期</th><th className="px-6 py-3">預計完成</th><th className="px-6 py-3 min-w-[150px]">進度</th><th className="px-6 py-3 text-right">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredTasks.map(task => (<TaskRow key={task.id} task={task} onEdit={() => { setCurrentTask(task); setIsEditing(true); }} onDelete={() => confirmDelete(task)} />))}
                {filteredTasks.length === 0 && <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400">沒有資料</td></tr>}
                </tbody>
            </table>
            </div>
        </div>
        </div>
    );
};

const MeetingMinutes = ({ db, user, canAccessAll, isAdmin, isRootAdmin, geminiApiKey, geminiModel, canUseAI, teams = [] }) => {
    const [meetings, setMeetings] = useState([]);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMeeting, setCurrentMeeting] = useState(null);
    const [categories, setCategories] = useState(['內部會議', '客戶會議', '專案檢討']);
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    const [aiLoading, setAiLoading] = useState(false);
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterTeam, setFilterTeam] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAIModal, setShowAIModal] = useState(false);

    // Leader 相關狀態
    const isLeader = useMemo(() => checkIsLeader(user, teams), [user, teams]);

    // 判斷是否為普通成員（非 Admin/Editor/Leader）
    const isRegularMember = !canAccessAll && !isLeader;

    // 計算用戶可選擇的團隊（Admin/Editor 可看全部，其他人只能選自己所屬的團隊）
    const userSelectableTeams = useMemo(() => {
        if (canAccessAll) return teams;
        if (!user?.email) return [];
        const userEmail = user.email.toLowerCase();
        return teams.filter(team => {
            const leaders = getTeamLeaders(team).map(l => l.toLowerCase());
            const members = (team.members || []).map(m => m.toLowerCase());
            return leaders.includes(userEmail) || members.includes(userEmail);
        });
    }, [canAccessAll, user, teams]);

    // Leader 篩選用的團隊列表（只有自己所屬的團隊）
    const filterableTeams = useMemo(() => {
        if (canAccessAll) return teams; // Admin/Editor 可選所有團隊
        // Leader 和普通成員只能篩選自己所屬的團隊
        return userSelectableTeams;
    }, [canAccessAll, teams, userSelectableTeams]);

    useEffect(() => {
        if (!db || !user) return;
        const q = canAccessAll
            ? query(collectionGroup(db, 'meetings'))
            : query(collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'meetings'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, path: doc.ref.path, ...doc.data() }));
        data.sort((a, b) => (new Date(b.date) - new Date(a.date)));
        setMeetings(data);
        }, (error) => console.error(error));
        return () => unsubscribe();
    }, [db, user, canAccessAll]);

    useEffect(() => {
        if (!db) return;
        const settingsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().meetingCategories) { setCategories(docSnap.data().meetingCategories); }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        let res = meetings;
        if (filterCategory !== 'All') { res = res.filter(m => m.category === filterCategory); }
        if (filterTeam !== 'All') { res = res.filter(m => m.teamId === filterTeam); }
        if (searchQuery.trim()) { const lowerQ = searchQuery.toLowerCase(); res = res.filter(m => m.topic.toLowerCase().includes(lowerQ) || m.host.toLowerCase().includes(lowerQ) || (m.createdByEmail && m.createdByEmail.toLowerCase().includes(lowerQ))); }
        setFilteredMeetings(res);
    }, [meetings, filterCategory, filterTeam, searchQuery]);

    const handleGenerateMeetingReport = () => {
        if (!filteredMeetings.length) {
            setModalConfig({ isOpen: true, type: 'confirm', title: '無資料', content: "目前列表為空。", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            return;
        }
        setShowAIModal(true);
    };

    const handleSave = async (formData) => {
        if (!formData.content || formData.content.trim() === '') { setModalConfig({ isOpen: true, type: 'danger', title: '驗證錯誤', content: "內容必填", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null }); return; }
        try {
        if (formData.id && formData.path) { await updateDoc(doc(db, formData.path), { ...formData, updatedAt: serverTimestamp() }); } 
        else { const collectionRef = collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'meetings'); await addDoc(collectionRef, { ...formData, updatedAt: serverTimestamp(), createdAt: serverTimestamp(), createdByEmail: user.email }); }
        setIsEditing(false); setCurrentMeeting(null);
        } catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };
    const confirmDelete = (meeting) => { setModalConfig({ isOpen: true, type: 'danger', title: '確認刪除', content: '確定要刪除？', onConfirm: () => executeDelete(meeting), onCancel: () => setModalConfig({ isOpen: false }) }); };
    const executeDelete = async (meeting) => {
        setModalConfig({ isOpen: false });
        try { if (meeting.path) { await deleteDoc(doc(db, meeting.path)); } else { await deleteDoc(doc(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'meetings', meeting.id)); } } 
        catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };
    const handleExport = () => { /* ... */ };

    return (
        <div className="space-y-6 animate-in fade-in">
        <Modal {...modalConfig} />
        <AIConversationModal
            isOpen={showAIModal}
            onClose={() => setShowAIModal(false)}
            rawData={filteredMeetings}
            geminiApiKey={geminiApiKey}
            geminiModel={geminiModel}
            dataType="meetings"
        />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2"><h2 className="text-2xl font-bold text-slate-800">會議記錄工具</h2>{canAccessAll && <span className={`text-xs px-2 py-1 rounded-full font-bold ${isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{isAdmin ? 'Admin View' : 'Editor View'}</span>}</div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm w-full sm:w-auto"><Search size={16} className="text-slate-400" /><input className="outline-none text-sm w-full sm:w-32" placeholder="搜尋..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                {!isRegularMember && <select className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm text-sm w-full sm:w-auto" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="All">全部分類</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>}
                {!isRegularMember && <select className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm text-sm w-full sm:w-auto" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}><option value="All">全部團隊</option>{filterableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
                {(isAdmin || canUseAI) && <button onClick={handleGenerateMeetingReport} className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition shadow-sm w-full sm:w-auto">{aiLoading ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18} />} AI 總結</button>}
                <button onClick={() => { setCurrentMeeting(null); setIsEditing(true); }} className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition shadow-md w-full sm:w-auto"><Plus size={18} /> 新增</button>
            </div>
        </div>
        {isEditing && (
            <MeetingForm initialData={currentMeeting} categories={categories} teams={userSelectableTeams} onSave={handleSave} onCancel={() => setIsEditing(false)} />
        )}
        <div className="space-y-4">
            {filteredMeetings.map(meeting => (
                <MeetingRow key={meeting.id} meeting={meeting} onEdit={() => { setCurrentMeeting(meeting); setIsEditing(true); }} onDelete={() => confirmDelete(meeting)} />
            ))}
            {filteredMeetings.length === 0 && <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">沒有資料</div>}
        </div>
        </div>
    );
};

const SettingsPage = ({ db, user, isAdmin, isEditor, cloudAdmins, cloudEditors, cloudAIUsers, rootAdmins, onSaveGeminiSettings, testConfig, geminiApiKey, geminiModel, teams = [] }) => {
    const [newCategory, setNewCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [newTaskSource, setNewTaskSource] = useState('');
    const [taskSources, setTaskSources] = useState([]);
    const [newTaskStatus, setNewTaskStatus] = useState('');
    const [taskStatuses, setTaskStatuses] = useState([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newEditorEmail, setNewEditorEmail] = useState('');
    const [newAIUserEmail, setNewAIUserEmail] = useState('');
    const [newLeaderEmail, setNewLeaderEmail] = useState('');
    const [selectedTeamForLeader, setSelectedTeamForLeader] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamLeader, setNewTeamLeader] = useState('');
    const [newTeamMembers, setNewTeamMembers] = useState('');
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [editTeamName, setEditTeamName] = useState('');
    const [editTeamLeader, setEditTeamLeader] = useState('');
    const [editTeamMembers, setEditTeamMembers] = useState('');
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    const isLeader = useMemo(() => checkIsLeader(user, teams), [user, teams]);
    const canEditDropdowns = isAdmin || isEditor || isLeader;
    const canEditTeams = isAdmin || isEditor;
    const canViewTeamPanel = isAdmin || isEditor || isLeader;
    const [allUsers, setAllUsers] = useState([]);
    const [isUserListLoading, setIsUserListLoading] = useState(false);
    const [userListError, setUserListError] = useState('');
    const [emailServiceConfig, setEmailServiceConfig] = useState({
        provider: 'emailjs',
        serviceId: '',
        templateId: '',
        publicKey: '',
        fromName: ''
    });
    const [emailServiceError, setEmailServiceError] = useState('');
    const [isEmailServiceSaving, setIsEmailServiceSaving] = useState(false);
    const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
    const [geminiModelInput, setGeminiModelInput] = useState('gemini-2.5-flash');
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isGeminiSaving, setIsGeminiSaving] = useState(false);
    const [isManualNotificationSending, setIsManualNotificationSending] = useState(false);
    const userTableColSpan = isAdmin ? 4 : 3;

    useEffect(() => {
        if (!db) return;
        const settingsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCategories(data.meetingCategories || ['內部會議', '客戶會議', '專案檢討', '腦力激盪']);
                setTaskSources(data.taskSources || ['Email', 'Meeting', 'Chat', 'Other']);
                setTaskStatuses(data.taskStatuses || ['Pending', 'On-going', 'Done']);
            } else {
                setCategories(['內部會議', '客戶會議', '專案檢討', '腦力激盪']);
                setTaskSources(['Email', 'Meeting', 'Chat', 'Other']);
                setTaskStatuses(['Pending', 'On-going', 'Done']);
            }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (!db || !canViewTeamPanel) return;
        setIsUserListLoading(true);
        setUserListError('');
        const q = query(collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users'), orderBy('lastSeen', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const users = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data();
                    return {
                        ...data,
                        uid: data.uid || docSnap.id,
                        email: data.email || '(未填寫)',
                        docId: docSnap.id
                    };
                });
                setAllUsers(users);
                setIsUserListLoading(false);
            },
            (error) => {
                console.error('User list snapshot error:', error);
                setUserListError(`讀取失敗：${error.message}`);
                setIsUserListLoading(false);
            }
        );
        return () => unsubscribe();
    }, [db, canViewTeamPanel]);

    useEffect(() => {
        if (!db || !isAdmin) return;
        const emailServiceRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'emailService');
        const unsubscribe = onSnapshot(
            emailServiceRef,
            (docSnap) => {
                setEmailServiceError('');
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEmailServiceConfig({
                        provider: data.provider || 'emailjs',
                        serviceId: data.serviceId || '',
                        templateId: data.templateId || '',
                        publicKey: data.publicKey || '',
                        fromName: data.fromName || ''
                    });
                } else {
                    setEmailServiceConfig({
                        provider: 'emailjs',
                        serviceId: '',
                        templateId: '',
                        publicKey: '',
                        fromName: ''
                    });
                }
            },
            (error) => {
                console.error('Email service settings snapshot error:', error);
                setEmailServiceError(`讀取失敗：${error.message}`);
            }
        );
        return () => unsubscribe();
    }, [db, isAdmin]);

    useEffect(() => {
        setGeminiApiKeyInput(geminiApiKey || '');
    }, [geminiApiKey]);

    useEffect(() => {
        setGeminiModelInput(geminiModel || 'gemini-2.5-flash');
    }, [geminiModel]);

    // 獲取可用的 Gemini 模型列表
    const fetchAvailableModels = async () => {
        const apiKey = geminiApiKeyInput.trim();
        if (!apiKey) {
            setAvailableModels([]);
            return;
        }
        setIsLoadingModels(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
            if (!response.ok) throw new Error('無法獲取模型列表');
            const data = await response.json();
            // 只顯示支援 generateContent 的模型
            const models = (data.models || [])
                .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                .map(m => ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName || m.name.replace('models/', ''),
                    description: m.description || ''
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
            setAvailableModels(models);
        } catch (e) {
            console.error('獲取模型列表失敗:', e);
            setAvailableModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleAddItem = async (field, newItem, list, setListState, setNewItemState) => {
        if (!newItem.trim()) return;
        if (list.includes(newItem.trim())) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "此選項已存在", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); return; }
        try { await setDoc(doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options'), { [field]: arrayUnion(newItem.trim()) }, { merge: true }); setNewItemState(''); } 
        catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "更新失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };
    const confirmDeleteItem = (field, itemToDelete, list) => { setModalConfig({ isOpen: true, type: 'danger', title: '確認刪除', content: `確定要刪除「${itemToDelete}」嗎？`, onConfirm: () => executeDeleteItem(field, itemToDelete, list), onCancel: () => setModalConfig({ isOpen: false }) }); };
    const executeDeleteItem = async (field, itemToDelete, list) => {
        setModalConfig({ isOpen: false });
        const settingsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options');
        try {
            const snapshot = await getDoc(settingsRef);
            let updatedList = [];
            if (snapshot.exists()) { updatedList = (snapshot.data()[field] || []).filter(c => c !== itemToDelete); } 
            else { updatedList = list.filter(c => c !== itemToDelete); }
            await setDoc(settingsRef, { [field]: updatedList }, { merge: true });
        } catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "刪除失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };
    const confirmDeleteUser = (userToDelete) => {
        if (!isAdmin) return;
        const label = formatEmailPrefix(userToDelete.email);
        setModalConfig({
            isOpen: true,
            type: 'danger',
            title: '刪除使用者',
            content: `確定要刪除 ${label} 的註冊資料嗎？此操作僅會移除登入清單記錄。`,
            onConfirm: () => executeDeleteUser(userToDelete),
            onCancel: () => setModalConfig({ isOpen: false })
        });
    };
    const executeDeleteUser = async (userToDelete) => {
        if (!db || !userToDelete?.docId) return;
        setModalConfig({ isOpen: false });
        try {
            const userEmail = userToDelete.email.toLowerCase();

            // 1. 刪除用戶註冊資料
            await deleteDoc(doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users', userToDelete.docId));

            // 2. 從團隊中移除（leaderIds 和 members）
            const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
            const teamsSnapshot = await getDoc(teamsRef);
            if (teamsSnapshot.exists()) {
                const currentTeams = teamsSnapshot.data().list || [];
                const updatedTeams = currentTeams.map(team => ({
                    ...team,
                    leaderIds: (team.leaderIds || []).filter(id => id.toLowerCase() !== userEmail),
                    members: (team.members || []).filter(m => m.toLowerCase() !== userEmail)
                }));
                await setDoc(teamsRef, { list: updatedTeams }, { merge: true });
            }

            // 3. 從權限列表中移除（admins, editors, aiUsers）
            const permissionTypes = ['admins', 'editors', 'aiUsers'];
            for (const type of permissionTypes) {
                const permRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', type);
                const permSnapshot = await getDoc(permRef);
                if (permSnapshot.exists()) {
                    const currentList = permSnapshot.data().list || [];
                    const updatedList = currentList.filter(e => e.toLowerCase() !== userEmail);
                    if (currentList.length !== updatedList.length) {
                        await setDoc(permRef, { list: updatedList }, { merge: true });
                    }
                }
            }

            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: '刪除成功',
                content: `已刪除 ${formatEmailPrefix(userToDelete.email)} 的所有資料（包含團隊和權限）。`,
                onConfirm: () => setModalConfig({ isOpen: false }),
                confirmText: "好",
                onCancel: null
            });
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "刪除失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };
    // 通用權限管理函數 (重構後)
    const PERMISSION_PATHS = {
        admins: 'artifacts/work-tracker-v1/public/data/settings/admins',
        editors: 'artifacts/work-tracker-v1/public/data/settings/editors',
        aiUsers: 'artifacts/work-tracker-v1/public/data/settings/aiUsers'
    };

    const handleAddPermission = async (type, email, existingList, rootList = []) => {
        const normalizedEmail = normalizePermissionEmail(email);
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請輸入使用者帳號", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return false;
        }
        const allExisting = [...existingList, ...rootList].map(e => e.toLowerCase());
        if (allExisting.includes(normalizedEmail)) {
            const typeNames = { admins: '管理員', editors: '編輯者', aiUsers: 'AI 使用' };
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: `該使用者已有${typeNames[type]}權限`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return false;
        }
        try {
            await setDoc(doc(db, ...PERMISSION_PATHS[type].split('/')), { list: arrayUnion(normalizedEmail) }, { merge: true });
            const typeNames = { admins: '管理員', editors: '編輯者', aiUsers: 'AI 使用權限' };
            setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: `已將 ${normalizedEmail} 新增為${typeNames[type]}`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            return true;
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "操作失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return false;
        }
    };

    const executeRemovePermission = async (type, emailToRemove) => {
        setModalConfig({ isOpen: false });
        const docRef = doc(db, ...PERMISSION_PATHS[type].split('/'));
        try {
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                const updatedList = (snapshot.data().list || []).filter(e => e !== emailToRemove);
                await setDoc(docRef, { list: updatedList }, { merge: true });
            }
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "操作失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };

    const confirmRemovePermission = (type, emailToRemove) => {
        const typeNames = { admins: '管理員', editors: '編輯者', aiUsers: 'AI 使用' };
        setModalConfig({
            isOpen: true, type: 'danger', title: '移除權限',
            content: `確定要移除 ${formatEmailPrefix(emailToRemove)} 的${typeNames[type]}權限？`,
            onConfirm: () => executeRemovePermission(type, emailToRemove),
            onCancel: () => setModalConfig({ isOpen: false })
        });
    };

    // 簡化的權限操作函數
    const handleAddAdmin = async () => {
        if (await handleAddPermission('admins', newAdminEmail, cloudAdmins, rootAdmins)) setNewAdminEmail('');
    };
    const confirmRemoveAdmin = (email) => confirmRemovePermission('admins', email);

    const handleAddEditor = async () => {
        // 編輯者不能同時是管理員
        const normalizedEmail = normalizePermissionEmail(newEditorEmail);
        const normalizedAdmins = [...cloudAdmins, ...rootAdmins].map(e => e.toLowerCase());
        if (normalizedAdmins.includes(normalizedEmail)) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "該使用者已經是管理員", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        if (await handleAddPermission('editors', newEditorEmail, cloudEditors)) setNewEditorEmail('');
    };
    const confirmRemoveEditor = (email) => confirmRemovePermission('editors', email);

    const handleAddAIUser = async () => {
        if (await handleAddPermission('aiUsers', newAIUserEmail, cloudAIUsers || [])) setNewAIUserEmail('');
    };
    const confirmRemoveAIUser = (email) => confirmRemovePermission('aiUsers', email);

    // Leader 管理（快速添加）
    const handleAddLeader = async () => {
        if (!newLeaderEmail) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請選擇使用者", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        const normalizedEmail = normalizePermissionEmail(newLeaderEmail);
        const leaderName = formatEmailPrefix(normalizedEmail);
        const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');

        try {
            if (selectedTeamForLeader) {
                // 添加到現有團隊
                const snapshot = await getDoc(teamsRef);
                if (snapshot.exists()) {
                    const currentList = snapshot.data().list || [];
                    const updatedList = currentList.map(t => {
                        if (t.id === selectedTeamForLeader) {
                            const currentLeaders = getTeamLeaders(t);
                            if (currentLeaders.map(l => l.toLowerCase()).includes(normalizedEmail.toLowerCase())) {
                                throw new Error("該使用者已經是此團隊的 Leader");
                            }
                            const updatedTeam = {
                                ...t,
                                leaderIds: [...currentLeaders, normalizedEmail]
                            };
                            delete updatedTeam.leaderId; // 移除舊格式
                            return updatedTeam;
                        }
                        return t;
                    });
                    await setDoc(teamsRef, { list: updatedList }, { merge: true });
                    const teamName = currentList.find(t => t.id === selectedTeamForLeader)?.name || '';
                    setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: `已將 ${leaderName} 加入團隊「${teamName}」為 Leader`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
                }
            } else {
                // 建立新團隊
                const newTeam = {
                    id: `team-${Date.now()}`,
                    name: `${leaderName} 的團隊`,
                    leaderIds: [normalizedEmail],
                    members: []
                };
                await setDoc(teamsRef, { list: arrayUnion(newTeam) }, { merge: true });
                setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: `已將 ${leaderName} 設為新團隊的 Leader`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            }
            setNewLeaderEmail('');
            setSelectedTeamForLeader('');
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: e.message || "操作失敗", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };

    // 團隊管理
    const handleAddTeam = async () => {
        const leaderList = newTeamLeader
            .split(',')
            .map(l => normalizePermissionEmail(l.trim()))
            .filter(Boolean);

        if (!newTeamName.trim() || leaderList.length === 0) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請填寫團隊名稱並選擇至少一位 Leader", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }

        const newTeam = {
            id: `team-${Date.now()}`,
            name: newTeamName.trim(),
            leaderIds: leaderList,
            members: [] // 成員由 Leader 自行管理
        };

        try {
            const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
            await setDoc(teamsRef, { list: arrayUnion(newTeam) }, { merge: true });
            setNewTeamName('');
            setNewTeamLeader('');
            setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: `已建立團隊「${newTeam.name}」，成員請由 Leader 自行管理`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "建立失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };
    const confirmDeleteTeam = (teamId, teamName) => {
        setModalConfig({ isOpen: true, type: 'danger', title: '確認刪除', content: `確定要刪除團隊「${teamName}」？`, onConfirm: () => executeDeleteTeam(teamId), onCancel: () => setModalConfig({ isOpen: false }) });
    };
    const executeDeleteTeam = async (teamId) => {
        setModalConfig({ isOpen: false });
        const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
        try {
            const snapshot = await getDoc(teamsRef);
            if (snapshot.exists()) {
                const updatedList = (snapshot.data().list || []).filter(t => t.id !== teamId);
                await setDoc(teamsRef, { list: updatedList }, { merge: true });
            }
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "刪除失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };

    // 檢查用戶是否可以管理特定團隊
    const canManageTeam = (team) => {
        if (isAdmin || isEditor) return true;
        if (isLeader && user?.email && getTeamLeaders(team).includes(user.email)) return true;
        return false;
    };

    // 開始編輯團隊
    const startEditTeam = (team) => {
        setEditingTeamId(team.id);
        setEditTeamName(team.name);
        setEditTeamLeader(getTeamLeaders(team).join(', '));
        setEditTeamMembers(team.members ? team.members.join(', ') : '');
    };

    // 取消編輯團隊
    const cancelEditTeam = () => {
        setEditingTeamId(null);
        setEditTeamName('');
        setEditTeamLeader('');
        setEditTeamMembers('');
    };

    // 儲存編輯的團隊
    const handleUpdateTeam = async (teamId) => {
        if (!editTeamName.trim()) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "團隊名稱不能為空", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        const memberList = [...new Set(editTeamMembers
            .split(',')
            .map(m => normalizePermissionEmail(m.trim()))
            .filter(Boolean))];
        const leaderList = [...new Set(editTeamLeader
            .split(',')
            .map(l => normalizePermissionEmail(l.trim()))
            .filter(Boolean))];

        const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
        try {
            const snapshot = await getDoc(teamsRef);
            if (snapshot.exists()) {
                const currentList = snapshot.data().list || [];
                const updatedList = currentList.map(t => {
                    if (t.id === teamId) {
                        const updatedTeam = {
                            ...t,
                            name: editTeamName.trim(),
                            members: memberList
                        };
                        // 只有 Admin/Editor 可以變更 Leader
                        if (isAdmin || isEditor) {
                            updatedTeam.leaderIds = leaderList;
                            delete updatedTeam.leaderId; // 移除舊格式
                        }
                        return updatedTeam;
                    }
                    return t;
                });
                await setDoc(teamsRef, { list: updatedList }, { merge: true });
                cancelEditTeam();
                setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: "團隊已更新", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            }
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "更新失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };

    const handleEmailServiceChange = (field, value) => {
        setEmailServiceConfig((prev) => ({ ...prev, [field]: value }));
    };

    const handleSaveEmailServiceSettings = async () => {
        if (!db) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "目前無法儲存 Email 服務設定", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        if (!emailServiceConfig.serviceId.trim() || !emailServiceConfig.templateId.trim() || !emailServiceConfig.publicKey.trim()) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請填寫 EmailJS Service ID / Template ID / Public Key", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        setIsEmailServiceSaving(true);
        try {
            await setDoc(
                doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'emailService'),
                {
                    provider: 'emailjs',
                    serviceId: emailServiceConfig.serviceId.trim(),
                    templateId: emailServiceConfig.templateId.trim(),
                    publicKey: emailServiceConfig.publicKey.trim(),
                    fromName: emailServiceConfig.fromName.trim(),
                    updatedAt: serverTimestamp(),
                    updatedBy: user?.email || null
                },
                { merge: true }
            );
            setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: "Email 服務設定已更新", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "更新失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        } finally {
            setIsEmailServiceSaving(false);
        }
    };

    const handleSaveGeminiSettingsLocal = async () => {
        const trimmedKey = geminiApiKeyInput.trim();
        if (!trimmedKey) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請填寫 Gemini API Key", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        if (!geminiModelInput) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請選擇模型版本", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        setIsGeminiSaving(true);
        try {
            await onSaveGeminiSettings(trimmedKey, geminiModelInput);
            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: '成功',
                content: "Gemini 設定已更新",
                onConfirm: () => setModalConfig({ isOpen: false }),
                confirmText: "好",
                onCancel: null
            });
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: `更新失敗：${e.message}`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        } finally {
            setIsGeminiSaving(false);
        }
    };

    const fetchOnGoingNotificationPayloads = async (notifyDate) => {
        const taskSnapshot = await getDocs(query(collectionGroup(db, 'tasks')));
        const tasks = taskSnapshot.docs.map((docSnap) => docSnap.data());
        const usersSnapshot = await getDocs(collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users'));
        const userEmails = usersSnapshot.docs
            .map((docSnap) => docSnap.data()?.email)
            .filter(Boolean);
        return buildNotificationPayloads(tasks, userEmails, notifyDate);
    };


    const handleManualOnGoingNotification = async () => {
        if (!db) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "目前無法發送通知", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        if (!emailServiceConfig.serviceId.trim() || !emailServiceConfig.templateId.trim() || !emailServiceConfig.publicKey.trim()) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請先完成 EmailJS 服務設定", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        setIsManualNotificationSending(true);
        try {
            const notifyDate = new Date();
            const payloads = await fetchOnGoingNotificationPayloads(notifyDate);
            if (!payloads.length) {
                setModalConfig({
                    isOpen: true,
                    type: 'danger',
                    title: '無通知可發送',
                    content: '目前沒有 On-going 待辦事項或負責人資料。',
                    onConfirm: () => setModalConfig({ isOpen: false }),
                    confirmText: '關閉',
                    onCancel: null
                });
                return;
            }
            const recipients = [...new Set(payloads.map((payload) => payload.to))];
            const preview = `通知數量：${payloads.length}\n收件人：${recipients.join('、')}`;
            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: '確認發送 On-going 通知',
                content: `將會發送目前 On-going 待辦的通知（不受每日限制）。\n${preview}`,
                onConfirm: async () => {
                    setModalConfig({ isOpen: false });
                    setIsManualNotificationSending(true);
                    try {
                        for (const payload of payloads) {
                            await sendEmailJsNotification(emailServiceConfig, payload);
                        }
                        setModalConfig({
                            isOpen: true,
                            type: 'confirm',
                            title: '通知發送完成',
                            content: preview,
                            onConfirm: () => setModalConfig({ isOpen: false }),
                            confirmText: '關閉',
                            onCancel: null
                        });
                    } catch (error) {
                        setModalConfig({
                            isOpen: true,
                            type: 'danger',
                            title: '發送失敗',
                            content: `EmailJS 發送失敗：${error.message}`,
                            onConfirm: () => setModalConfig({ isOpen: false }),
                            confirmText: '關閉',
                            onCancel: null
                        });
                    } finally {
                        setIsManualNotificationSending(false);
                    }
                },
                confirmText: '確認發送',
                onCancel: () => setModalConfig({ isOpen: false })
            });
        } catch (error) {
            setModalConfig({
                isOpen: true,
                type: 'danger',
                title: '發送失敗',
                content: `通知準備失敗：${error.message}`,
                onConfirm: () => setModalConfig({ isOpen: false }),
                confirmText: '關閉',
                onCancel: null
            });
        } finally {
            setIsManualNotificationSending(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
            <Modal {...modalConfig} />
            
            {/* User Registry List */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200" data-testid="registered-users">
                <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-blue-100 rounded-full"><Users className="text-blue-700" size={24} /></div><div><h2 className="text-xl font-bold text-slate-800">已註冊使用者列表</h2><p className="text-sm text-slate-500">檢視所有登入過系統的帳號</p></div></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">使用者</th>
                                <th className="px-4 py-3">User UID</th>
                                <th className="px-4 py-3">最後上線</th>
                                {isAdmin && <th className="px-4 py-3 text-right">操作</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {userListError ? (
                                <tr><td colSpan={userTableColSpan} className="px-4 py-4 text-center text-red-500">{userListError}</td></tr>
                            ) : isUserListLoading ? (
                                <tr><td colSpan={userTableColSpan} className="px-4 py-4 text-center text-slate-400">資料載入中...</td></tr>
                            ) : allUsers.length === 0 ? (
                                <tr><td colSpan={userTableColSpan} className="px-4 py-4 text-center text-slate-400">尚無資料</td></tr>
                            ) : (
                                allUsers.map((u) => {
                                    const lastSeenDate = u.lastSeen?.toDate
                                        ? u.lastSeen.toDate()
                                        : (u.lastSeen?.seconds ? new Date(u.lastSeen.seconds * 1000) : null);
                                    const isSelf = user?.email && u.email === user.email;
                                    const isRootAdmin = rootAdmins.includes(u.email);
                                    const canDelete = isAdmin && !isSelf && !isRootAdmin;
                                    return (
                                        <tr key={u.uid} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-800">{formatEmailPrefix(u.email)}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.uid}</td>
                                            <td className="px-4 py-3 text-xs">{lastSeenDate ? lastSeenDate.toLocaleString() : 'N/A'}</td>
                                            {isAdmin && (
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => canDelete && confirmDeleteUser(u)}
                                                        disabled={!canDelete}
                                                        className={`p-1 rounded transition ${canDelete ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed'}`}
                                                        title={canDelete ? '刪除使用者' : (isSelf ? '不可刪除自己' : '不可刪除系統管理員')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gemini Settings - Admin Only */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200" data-testid="gemini-settings">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-full bg-purple-100">
                            <Bot className="text-purple-700" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Gemini API 設定</h2>
                            <p className="text-sm text-slate-500">提供 AI 報告與會議摘要服務</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gemini API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={geminiApiKeyInput}
                                    onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                                    className="flex-1 p-2 border rounded"
                                    placeholder="請輸入 Gemini API Key"
                                    data-testid="gemini-api-key-input"
                                />
                                <button
                                    onClick={fetchAvailableModels}
                                    disabled={!geminiApiKeyInput.trim() || isLoadingModels}
                                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                >
                                    {isLoadingModels ? '載入中...' : '偵測模型'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">模型版本</label>
                            <select
                                value={geminiModelInput}
                                onChange={(e) => setGeminiModelInput(e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                {availableModels.length > 0 ? (
                                    availableModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))
                                ) : (
                                    <>
                                        <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    </>
                                )}
                            </select>
                            <p className="text-xs text-slate-400 mt-1">
                                {availableModels.length > 0
                                    ? `已偵測到 ${availableModels.length} 個可用模型`
                                    : '輸入 API Key 後點擊「偵測模型」可獲取完整模型列表'}
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveGeminiSettingsLocal}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={(!db && !testConfig.enabled) || isGeminiSaving}
                                data-testid="gemini-api-key-save-button"
                            >
                                {isGeminiSaving ? '儲存中...' : '儲存 Gemini 設定'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Settings - Admin Only */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200" data-testid="notification-settings">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-full bg-amber-100">
                            <Clock className="text-amber-700" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">郵件通知設定</h2>
                            <p className="text-sm text-slate-500">設定 EmailJS 服務並手動發送 On-going 通知</p>
                        </div>
                    </div>
                    {emailServiceError && (
                        <div className="mb-4 text-sm text-red-600">{emailServiceError}</div>
                    )}
                    <div className="flex flex-col gap-4">
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <h3 className="text-sm font-bold text-slate-700">EmailJS 發信服務設定</h3>
                            <p className="text-xs text-slate-400">
                                需先於 EmailJS 建立服務與範本，並提供 template params：to_email / subject / message / from_name。
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service ID</label>
                                    <input
                                        type="text"
                                        value={emailServiceConfig.serviceId}
                                        onChange={(e) => handleEmailServiceChange('serviceId', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        data-testid="emailjs-service-id"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template ID</label>
                                    <input
                                        type="text"
                                        value={emailServiceConfig.templateId}
                                        onChange={(e) => handleEmailServiceChange('templateId', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        data-testid="emailjs-template-id"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Public Key</label>
                                    <input
                                        type="text"
                                        value={emailServiceConfig.publicKey}
                                        onChange={(e) => handleEmailServiceChange('publicKey', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        data-testid="emailjs-public-key"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">寄件人名稱</label>
                                    <input
                                        type="text"
                                        value={emailServiceConfig.fromName}
                                        onChange={(e) => handleEmailServiceChange('fromName', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        placeholder="Job Management System"
                                        data-testid="emailjs-from-name"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveEmailServiceSettings}
                                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!db || isEmailServiceSaving}
                                    data-testid="emailjs-save-button"
                                >
                                    {isEmailServiceSaving ? '儲存中...' : '儲存 Email 服務'}
                                </button>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100" data-testid="notification-manual-trigger">
                            <h3 className="text-sm font-bold text-slate-700 mb-2">發送 On-going 通知</h3>
                            <p className="text-xs text-slate-400 mb-3">
                                依目前 On-going 待辦與負責人資料寄送通知，不受每日限制，且不會更新每日寄送紀錄。
                            </p>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleManualOnGoingNotification}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isManualNotificationSending}
                                    data-testid="notification-manual-trigger-button"
                                >
                                    {isManualNotificationSending ? '發送中...' : '立即發送 On-going 通知'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Management Panel */}
            {isAdmin && (
                <div className="bg-yellow-50 p-8 rounded-xl shadow-sm border border-yellow-200" data-testid="admin-permission-section">
                    <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-yellow-100 rounded-full"><UserCog className="text-yellow-700" size={24} /></div><div><h2 className="text-xl font-bold text-yellow-900">使用者權限管理</h2><p className="text-sm text-yellow-700">管理誰可以修改全域設定</p></div></div>
                    <div className="flex gap-2 mb-6">
                        <select
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="flex-1 p-2 border border-yellow-300 rounded-lg text-sm bg-white"
                            data-testid="admin-email-input"
                        >
                            <option value="">選擇使用者</option>
                            {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !rootAdmins.includes(u.email) && !cloudAdmins.includes(u.email)).map(u => (
                                <option key={u.uid} value={u.email}>{formatEmailPrefix(u.email)}</option>
                            ))}
                        </select>
                        <button onClick={handleAddAdmin} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm whitespace-nowrap" data-testid="admin-email-submit">新增管理員</button>
                    </div>
                    <div className="bg-white rounded-lg border border-yellow-200 overflow-hidden"><ul className="divide-y divide-yellow-100">{rootAdmins.map(email => (<li key={email} className="px-4 py-3 flex justify-between items-center text-sm"><span className="flex items-center gap-2 font-bold text-slate-700"><ShieldCheck size={14} className="text-purple-600"/> {formatEmailPrefix(email)}</span><span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">系統預設</span></li>))}{cloudAdmins.map(email => (<li key={email} className="px-4 py-3 flex justify-between items-center text-sm"><span className="flex items-center gap-2 text-slate-700"><ShieldCheck size={14} className="text-yellow-600"/> {formatEmailPrefix(email)}</span><button onClick={() => confirmRemoveAdmin(email)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"><Trash2 size={16} /></button></li>))}</ul></div>
                </div>
            )}

            {/* Editor Management Panel */}
            {isAdmin && (
                <div className="bg-blue-50 p-8 rounded-xl shadow-sm border border-blue-200" data-testid="editor-permission-section">
                    <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-blue-100 rounded-full"><User className="text-blue-700" size={24} /></div><div><h2 className="text-xl font-bold text-blue-900">編輯者權限管理</h2><p className="text-sm text-blue-700">可檢視與編輯所有資料及下拉選單設定</p></div></div>
                    <div className="flex gap-2 mb-6">
                        <select
                            value={newEditorEmail}
                            onChange={(e) => setNewEditorEmail(e.target.value)}
                            className="flex-1 p-2 border border-blue-300 rounded-lg text-sm bg-white"
                            data-testid="editor-email-input"
                        >
                            <option value="">選擇使用者</option>
                            {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !rootAdmins.includes(u.email) && !cloudAdmins.includes(u.email) && !cloudEditors.includes(u.email)).map(u => (
                                <option key={u.uid} value={u.email}>{formatEmailPrefix(u.email)}</option>
                            ))}
                        </select>
                        <button onClick={handleAddEditor} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap" data-testid="editor-email-submit">新增編輯者</button>
                    </div>
                    <div className="bg-white rounded-lg border border-blue-200 overflow-hidden"><ul className="divide-y divide-blue-100">{cloudEditors.length === 0 ? (<li className="px-4 py-3 text-sm text-slate-400">尚無編輯者</li>) : cloudEditors.map(email => (<li key={email} className="px-4 py-3 flex justify-between items-center text-sm"><span className="flex items-center gap-2 text-slate-700"><ShieldCheck size={14} className="text-blue-600"/> {formatEmailPrefix(email)}</span><button onClick={() => confirmRemoveEditor(email)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"><Trash2 size={16} /></button></li>))}</ul></div>
                </div>
            )}

            {/* AI User Management Panel */}
            {isAdmin && (
                <div className="bg-purple-50 p-8 rounded-xl shadow-sm border border-purple-200">
                    <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-purple-100 rounded-full"><Bot className="text-purple-700" size={24} /></div><div><h2 className="text-xl font-bold text-purple-900">AI 使用權限管理</h2><p className="text-sm text-purple-700">授予一般使用者 AI 總結功能的使用權限</p></div></div>
                    <div className="flex gap-2 mb-6">
                        <select
                            value={newAIUserEmail}
                            onChange={(e) => setNewAIUserEmail(e.target.value)}
                            className="flex-1 p-2 border border-purple-300 rounded-lg text-sm bg-white"
                        >
                            <option value="">選擇使用者</option>
                            {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !(cloudAIUsers || []).includes(u.email)).map(u => (
                                <option key={u.uid} value={u.email}>{formatEmailPrefix(u.email)}</option>
                            ))}
                        </select>
                        <button onClick={handleAddAIUser} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm whitespace-nowrap">新增 AI 使用者</button>
                    </div>
                    <div className="bg-white rounded-lg border border-purple-200 overflow-hidden"><ul className="divide-y divide-purple-100">{(!cloudAIUsers || cloudAIUsers.length === 0) ? (<li className="px-4 py-3 text-sm text-slate-400">尚無 AI 使用者</li>) : cloudAIUsers.map(email => (<li key={email} className="px-4 py-3 flex justify-between items-center text-sm"><span className="flex items-center gap-2 text-slate-700"><Sparkles size={14} className="text-purple-600"/> {formatEmailPrefix(email)}</span><button onClick={() => confirmRemoveAIUser(email)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"><Trash2 size={16} /></button></li>))}</ul></div>
                </div>
            )}

            {/* Team Management Panel */}
            {canViewTeamPanel && (
                <div className="bg-teal-50 p-8 rounded-xl shadow-sm border border-teal-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-teal-100 rounded-full"><Users className="text-teal-700" size={24} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-teal-900">團隊管理</h2>
                            <p className="text-sm text-teal-700">
                                {canEditTeams ? '設定團隊讓 Leader 可查看成員待辦事項' : '管理你的團隊成員'}
                            </p>
                        </div>
                    </div>
                    {/* 新增團隊表單 - 僅 Admin/Editor 可見 */}
                    {canEditTeams && (
                        <div className="bg-white p-4 rounded-lg border border-teal-200 mb-4">
                            <h3 className="font-bold text-slate-700 mb-3">新增團隊</h3>
                            <div className="mb-3">
                                <label className="block text-xs text-slate-500 mb-1">團隊名稱</label>
                                <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="輸入團隊名稱" className="w-full p-2 border border-teal-300 rounded-lg text-sm" />
                            </div>
                            <div className="mb-3">
                                <label className="block text-xs text-slate-500 mb-1">選擇 Leader（可多選）</label>
                                <div className="max-h-32 overflow-y-auto border border-teal-200 rounded-lg p-2 bg-white">
                                    {allUsers.filter(u => u.email && u.email !== '(未填寫)').map(u => {
                                        const leaderList = newTeamLeader.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
                                        const isSelected = leaderList.includes(u.email.toLowerCase());
                                        return (
                                            <label key={u.uid} className="flex items-center gap-2 p-1.5 hover:bg-teal-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewTeamLeader(prev => prev ? `${prev}, ${u.email}` : u.email);
                                                        } else {
                                                            setNewTeamLeader(prev => prev.split(',').map(l => l.trim()).filter(l => l.toLowerCase() !== u.email.toLowerCase()).join(', '));
                                                        }
                                                    }}
                                                    className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <span className="text-sm text-slate-700">{formatEmailPrefix(u.email)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <p className="text-xs text-teal-600 mb-3">團隊成員由 Leader 自行管理。</p>
                            <button onClick={handleAddTeam} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">建立團隊</button>
                        </div>
                    )}
                    {/* 團隊列表 */}
                    <div className="space-y-3">
                        {(() => {
                            const visibleTeams = canEditTeams ? teams : teams.filter(t => getTeamLeaders(t).includes(user?.email));
                            if (!visibleTeams || visibleTeams.length === 0) {
                                return <p className="text-sm text-slate-400">{canEditTeams ? '尚無團隊' : '你目前沒有管理的團隊'}</p>;
                            }
                            return visibleTeams.map(team => (
                                <div key={team.id} className="bg-white p-4 rounded-lg border border-teal-200">
                                    {editingTeamId === team.id ? (
                                        /* 編輯模式 */
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">團隊名稱</label>
                                                    <input value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} placeholder="團隊名稱" className="w-full p-2 border border-teal-300 rounded-lg text-sm" />
                                                </div>
                                                {canEditTeams && (
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Leader（可多選）</label>
                                                        <div className="max-h-32 overflow-y-auto border border-teal-200 rounded-lg p-2 bg-white">
                                                            {allUsers.filter(u => u.email && u.email !== '(未填寫)').map(u => {
                                                                const leaderList = editTeamLeader.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
                                                                const isSelected = leaderList.includes(u.email.toLowerCase());
                                                                return (
                                                                    <label key={u.uid} className="flex items-center gap-2 p-1.5 hover:bg-teal-50 rounded cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setEditTeamLeader(prev => prev ? `${prev}, ${u.email}` : u.email);
                                                                                } else {
                                                                                    setEditTeamLeader(prev => prev.split(',').map(l => l.trim()).filter(l => l.toLowerCase() !== u.email.toLowerCase()).join(', '));
                                                                                }
                                                                            }}
                                                                            className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                                                                        />
                                                                        <span className="text-sm text-slate-700">{formatEmailPrefix(u.email)}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">選擇成員</label>
                                                <div className="max-h-40 overflow-y-auto border border-teal-200 rounded-lg p-2 bg-white">
                                                    {(() => {
                                                        const leaderEmails = editTeamLeader.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
                                                        const memberList = editTeamMembers.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
                                                        const allUserEmails = allUsers.filter(u => u.email && u.email !== '(未填寫)').map(u => u.email.toLowerCase());

                                                        // 合併：allUsers + 現有成員（可能已不在 allUsers 中）
                                                        const orphanedMembers = memberList.filter(m => !allUserEmails.includes(m) && !leaderEmails.includes(m));

                                                        return (
                                                            <>
                                                                {/* 顯示已不存在的成員（可移除） */}
                                                                {orphanedMembers.map(m => (
                                                                    <label key={m} className="flex items-center gap-2 p-1.5 hover:bg-red-50 rounded cursor-pointer bg-red-50">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={true}
                                                                            onChange={() => {
                                                                                setEditTeamMembers(prev => prev.split(',').map(p => p.trim()).filter(p => p.toLowerCase() !== m).join(', '));
                                                                            }}
                                                                            className="rounded border-red-300 text-red-600 focus:ring-red-500"
                                                                        />
                                                                        <span className="text-sm text-red-700">{formatEmailPrefix(m)} <span className="text-xs text-red-500">(已刪除)</span></span>
                                                                    </label>
                                                                ))}
                                                                {/* 顯示現有用戶 */}
                                                                {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !leaderEmails.includes(u.email.toLowerCase())).map(u => {
                                                                    const isSelected = memberList.includes(u.email.toLowerCase());
                                                                    return (
                                                                        <label key={u.uid} className="flex items-center gap-2 p-1.5 hover:bg-teal-50 rounded cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setEditTeamMembers(prev => prev ? `${prev}, ${u.email}` : u.email);
                                                                                    } else {
                                                                                        setEditTeamMembers(prev => prev.split(',').map(m => m.trim()).filter(m => m.toLowerCase() !== u.email.toLowerCase()).join(', '));
                                                                                    }
                                                                                }}
                                                                                className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                                                                            />
                                                                            <span className="text-sm text-slate-700">{formatEmailPrefix(u.email)}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </>
                                                        );
                                                    })()}
                                                    {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !editTeamLeader.split(',').map(l => l.trim().toLowerCase()).includes(u.email.toLowerCase())).length === 0 && (
                                                        <p className="text-xs text-slate-400 p-2">沒有可選擇的成員</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleUpdateTeam(team.id)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center gap-1"><Save size={14} /> 儲存</button>
                                                <button onClick={cancelEditTeam} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm flex items-center gap-1"><X size={14} /> 取消</button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* 顯示模式 */
                                        <>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{team.name}</h4>
                                                    <p className="text-xs text-teal-600">Leader: {getTeamLeaders(team).map(l => formatEmailPrefix(l)).join(', ')}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {canManageTeam(team) && (
                                                        <button onClick={() => startEditTeam(team)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="編輯團隊"><Edit2 size={16} /></button>
                                                    )}
                                                    {canEditTeams && (
                                                        <button onClick={() => confirmDeleteTeam(team.id, team.name)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition" title="刪除團隊"><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {team.members && team.members.length > 0 ? [...new Set(team.members)].map(m => (
                                                    <span key={m} className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">{formatEmailPrefix(m)}</span>
                                                )) : <span className="text-xs text-slate-400">尚無成員</span>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}

            {/* Global Options: Meeting Categories */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6"><div className={`p-3 rounded-full ${canEditDropdowns ? 'bg-emerald-100' : 'bg-slate-100'}`}>{canEditDropdowns ? <ShieldCheck className="text-emerald-700" size={24} /> : <Lock className="text-slate-500" size={24} />}</div><div><h2 className="text-xl font-bold text-slate-800">全域下拉選單 - 會議分類</h2></div></div>
                {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="輸入新分類名稱" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('meetingCategories', newCategory, categories, setCategories, setNewCategory)} /><button onClick={() => handleAddItem('meetingCategories', newCategory, categories, setCategories, setNewCategory)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">新增</button></div>)}
                <div className="flex flex-wrap gap-2">{categories.map((cat, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{cat}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('meetingCategories', cat, categories)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
            </div>

            {/* Global Options: Task Sources */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6"><div className={`p-3 rounded-full ${canEditDropdowns ? 'bg-blue-100' : 'bg-slate-100'}`}>{canEditDropdowns ? <ShieldCheck className="text-blue-700" size={24} /> : <Lock className="text-slate-500" size={24} />}</div><div><h2 className="text-xl font-bold text-slate-800">全域下拉選單 - 待辦來源</h2></div></div>
                {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newTaskSource} onChange={(e) => setNewTaskSource(e.target.value)} placeholder="輸入新來源名稱" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('taskSources', newTaskSource, taskSources, setTaskSources, setNewTaskSource)} /><button onClick={() => handleAddItem('taskSources', newTaskSource, taskSources, setTaskSources, setNewTaskSource)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">新增</button></div>)}
                <div className="flex flex-wrap gap-2">{taskSources.map((src, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{src}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('taskSources', src, taskSources)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
            </div>

            {/* Global Options: Task Statuses */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6"><div className={`p-3 rounded-full ${canEditDropdowns ? 'bg-indigo-100' : 'bg-slate-100'}`}>{canEditDropdowns ? <ShieldCheck className="text-indigo-700" size={24} /> : <Lock className="text-slate-500" size={24} />}</div><div><h2 className="text-xl font-bold text-slate-800">全域下拉選單 - 待辦狀態</h2></div></div>
                {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)} placeholder="輸入新狀態名稱" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('taskStatuses', newTaskStatus, taskStatuses, setTaskStatuses, setNewTaskStatus)} /><button onClick={() => handleAddItem('taskStatuses', newTaskStatus, taskStatuses, setTaskStatuses, setNewTaskStatus)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">新增</button></div>)}
                <div className="flex flex-wrap gap-2">{taskStatuses.map((st, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{st}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('taskStatuses', st, taskStatuses)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
            </div>
        </div>
    );
};

// --- 4. Main App Component (Must be last) ---

const App = () => {
    const [activeTab, setActiveTab] = useState('tasks'); 
    const [appInstance, setAppInstance] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('初始化中...');
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [cloudAdmins, setCloudAdmins] = useState([]);
    const [cloudEditors, setCloudEditors] = useState([]);
    const [cloudAIUsers, setCloudAIUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [locale, setLocale] = useState(() => localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE);
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
    const localeConvertersRef = useRef(null);
    const originalLocaleTextRef = useRef(new WeakMap());
    const isLocaleUpdatingRef = useRef(false);

    const testConfig = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        return {
            enabled: params.get('testMode') === '1',
            userEmail: params.get('testUserEmail'),
            forceAuthPage: params.get('testAuth') === '1'
        };
    }, []);
    
    useEffect(() => {
        if (testConfig.enabled) {
            if (testConfig.forceAuthPage) {
                setUser(null);
                setConnectionStatus('測試模式');
                setIsAuthChecking(false);
                return;
            }
            setUser({ uid: 'test-mode', email: testConfig.userEmail || null });
            setConnectionStatus('測試模式');
            setIsAuthChecking(false);
            return;
        }
        const initFirebase = async () => {
            try {
                const APP_NAME = 'work-tracker-app';
                let app;
                const existingApp = getApps().find(app => app.name === APP_NAME);
                if (existingApp) {
                    app = existingApp;
                } else {
                    app = initializeApp(DEFAULT_CONFIG, APP_NAME);
                }
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);
                setAppInstance(app);
                setAuth(authInstance);
                setDb(dbInstance);
                setConnectionStatus(navigator.onLine ? '連線中...' : '離線');
                onAuthStateChanged(authInstance, (u) => {
                    setUser(u);
                    setIsAuthChecking(false);
                });
            } catch (err) {
                console.error("Firebase Init Error:", err);
                setError(`連線錯誤: ${err.message}`);
                setConnectionStatus('連線錯誤');
                setIsAuthChecking(false);
            }
        };
        initFirebase();
    }, [testConfig.enabled, testConfig.userEmail]);

    useEffect(() => {
        if (!OpenCC) return;
        if (!localeConvertersRef.current) {
            localeConvertersRef.current = {
                toSimplified: OpenCC.Converter({ from: 'tw', to: 'cn' }),
                toTraditional: OpenCC.Converter({ from: 'cn', to: 'tw' })
            };
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale === 'zh-Hans' ? 'zh-CN' : 'zh-TW';
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
        if (!localeConvertersRef.current) return;
        applyLocaleToDocument(locale, localeConvertersRef.current, originalLocaleTextRef.current, isLocaleUpdatingRef);
        if (locale !== 'zh-Hans') return;
        const observer = new MutationObserver(() => {
            applyLocaleToDocument(locale, localeConvertersRef.current, originalLocaleTextRef.current, isLocaleUpdatingRef);
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    }, [locale]);

    useEffect(() => {
        if (!db || testConfig.enabled) return;
        const statusRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'connection');
        const unsubscribe = onSnapshot(
            statusRef,
            { includeMetadataChanges: true },
            (docSnap) => {
                if (docSnap.metadata.fromCache) {
                    setConnectionStatus(navigator.onLine ? '離線（快取）' : '離線');
                } else {
                    setConnectionStatus('已連線');
                }
            },
            (err) => {
                console.error("Firebase Connection Error:", err);
                setConnectionStatus('連線錯誤');
            }
        );
        const handleOnline = () => setConnectionStatus('連線中...');
        const handleOffline = () => setConnectionStatus('離線');
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [db, testConfig.enabled]);

    useEffect(() => {
        if (!db) return;
        const adminsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'admins');
        const unsubscribe = onSnapshot(adminsRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().list) {
                setCloudAdmins(docSnap.data().list);
            } else {
                setCloudAdmins([]);
            }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (!db) return;
        const editorsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'editors');
        const unsubscribe = onSnapshot(editorsRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().list) {
                setCloudEditors(docSnap.data().list);
            } else {
                setCloudEditors([]);
            }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (!db) return;
        const aiUsersRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'aiUsers');
        const unsubscribe = onSnapshot(aiUsersRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().list) {
                setCloudAIUsers(docSnap.data().list);
            } else {
                setCloudAIUsers([]);
            }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (!db) return;
        const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
        const unsubscribe = onSnapshot(teamsRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().list) {
                setTeams(docSnap.data().list);
            } else {
                setTeams([]);
            }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (!db || testConfig.enabled) return;
        const geminiRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'gemini');
        const unsubscribe = onSnapshot(
            geminiRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setGeminiApiKey(data.apiKey || '');
                    setGeminiModel(data.model || 'gemini-2.5-flash');
                } else {
                    setGeminiApiKey('');
                    setGeminiModel('gemini-2.5-flash');
                }
            },
            (error) => {
                console.error('Gemini settings snapshot error:', error);
                setGeminiApiKey('');
            }
        );
        return () => unsubscribe();
    }, [db, testConfig.enabled]);

    useEffect(() => {
        if (testConfig.enabled) return;
        if (!db || !user || !user.uid) return;
        const registerUser = async () => {
            try {
                const userRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users', user.uid);
                const snapshot = await getDoc(userRef);
                const existingData = snapshot.exists() ? snapshot.data() : {};
                const resolvedEmail = user.email || existingData.email;
                const payload = {
                    uid: user.uid,
                    lastSeen: serverTimestamp(),
                    lastLoginAt: serverTimestamp()
                };
                if (resolvedEmail) {
                    payload.email = resolvedEmail;
                }
                if (!existingData.createdAt) {
                    payload.createdAt = serverTimestamp();
                }
                await setDoc(userRef, payload, { merge: true });
            } catch (e) {
                console.error("User Registry Error:", e);
            }
        };
        registerUser();
    }, [db, user, testConfig.enabled]);

    const isUserAdmin = useMemo(() => checkIsAdmin(user, cloudAdmins), [user, cloudAdmins]);
    const isUserEditor = useMemo(() => checkIsEditor(user, cloudEditors), [user, cloudEditors]);
    const isUserCanUseAI = useMemo(() => checkCanUseAI(user, cloudAIUsers), [user, cloudAIUsers]);
    const isUserLeader = useMemo(() => checkIsLeader(user, teams), [user, teams]);
    const isUserPrivileged = isUserAdmin || isUserEditor;
    const canAccessSettings = isUserAdmin || isUserEditor || isUserLeader;
    const userDisplayName = useMemo(() => formatEmailPrefix(user?.email), [user]);
    const connectionIndicatorClass = useMemo(() => {
        if (connectionStatus.includes('已連線')) return 'bg-emerald-400';
        if (connectionStatus.includes('離線')) return 'bg-red-400';
        if (connectionStatus.includes('測試模式')) return 'bg-amber-400';
        return 'bg-slate-400';
    }, [connectionStatus]);

    const handleSaveGeminiSettings = async (key, model) => {
        if (testConfig.enabled || !db) {
            setGeminiApiKey(key);
            setGeminiModel(model);
            return;
        }
        await setDoc(
            doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'gemini'),
            {
                apiKey: key,
                model: model,
                updatedAt: serverTimestamp(),
                updatedBy: user?.email || null
            },
            { merge: true }
        );
    };

    if (isAuthChecking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-slate-500">
                <Loader2 size={48} className="animate-spin mb-4 text-blue-600" />
                <p>正在連線至系統...</p>
            </div>
        );
    }

    if (!user) {
        return <AuthPage auth={auth} error={error} connectionStatus={connectionStatus} />;
    }

    // 新用戶等待配置團隊視窗
    const isNewUserWithoutTeam = !isUserAdmin && !isUserEditor && !checkIsInAnyTeam(user, teams);
    if (isNewUserWithoutTeam && teams.length > 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-slate-200">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock size={40} className="text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">等待團隊配置</h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                        您的帳號 <span className="font-semibold text-blue-600">{formatEmailPrefix(user.email)}</span> 尚未被分配到任何團隊。
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                        <p className="text-amber-800 text-sm">
                            <strong>請聯繫系統管理員：</strong><br />
                            <span className="text-amber-700">Doris Kuo</span>
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">系統管理員會盡快為您配置團隊權限</p>
                    {!testConfig.enabled && auth && (
                        <button
                            onClick={() => signOut(auth)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition font-medium"
                        >
                            <LogOut size={18} />
                            登出
                        </button>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-6">System Creator: {SYSTEM_CREATOR} | Version: {APP_VERSION}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-800 flex flex-col md:flex-row" data-testid="app-shell">
            <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-xl z-10">
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Database className="text-blue-400" />
                        工作紀錄中心
                    </h1>
                    <p className="text-xs text-slate-400 mt-2">Firebase 雲端同步版</p>
                    <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-2" data-testid="firebase-status">
                        <span className={`inline-block w-2 h-2 rounded-full ${connectionIndicatorClass}`} />
                        <span>Firebase 連線狀態：{connectionStatus}</span>
                    </div>
                </div>
                <nav className="p-4 space-y-2 flex-1">
                    <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="數據看板" />
                    <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckCircle2 size={20} />} label="待辦事項" />
                    <NavButton active={activeTab === 'meetings'} onClick={() => setActiveTab('meetings')} icon={<Users size={20} />} label="會議記錄" />
                    
                    {canAccessSettings && (
                        <div className="pt-4 border-t border-slate-700 mt-4">
                            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="系統設定" />
                        </div>
                    )}
                </nav>
                <div className="p-4 bg-slate-800 border-t border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                            {userDisplayName ? userDisplayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold truncate w-32" data-testid="user-display-name">{userDisplayName}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                {isUserAdmin ? (
                                    <span className="text-yellow-400 flex items-center gap-0.5"><ShieldCheck size={10}/> Admin</span>
                                ) : isUserEditor ? (
                                    <span className="text-blue-400 flex items-center gap-0.5"><ShieldCheck size={10}/> Editor</span>
                                ) : isUserLeader ? (
                                    <span className="text-teal-400 flex items-center gap-0.5"><ShieldCheck size={10}/> Leader</span>
                                ) : (
                                    'User'
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {!testConfig.enabled && auth && (
                        <button onClick={() => signOut(auth)} className="w-full text-xs flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition mb-3">
                            <LogOut size={14} /> 登出
                        </button>
                    )}

                    <div className="pt-3 border-t border-slate-700 text-[10px] text-slate-500 text-center">
                        <div className="flex items-center justify-between mb-3 text-[11px] text-slate-400" data-testid="locale-toggle">
                            <span>語系</span>
                            <button
                                onClick={() => setLocale((prev) => (prev === 'zh-Hant' ? 'zh-Hans' : 'zh-Hant'))}
                                className="px-2 py-1 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 transition"
                                data-testid="locale-toggle-button"
                            >
                                {locale === 'zh-Hant' ? '简体' : '繁體'}
                            </button>
                        </div>
                        <p>System Creator: {SYSTEM_CREATOR}</p>
                        <p>Version: {APP_VERSION}</p>
                    </div>
                </div>
            </aside>
            
            <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 relative bg-slate-50/50">
                {activeTab === 'dashboard' && <Dashboard db={db} user={user} canAccessAll={isUserPrivileged} isAdmin={isUserAdmin} />}
                {activeTab === 'tasks' && (
                    <TaskManager
                        db={db}
                        user={user}
                        canAccessAll={isUserPrivileged}
                        isAdmin={isUserAdmin}
                        testConfig={testConfig}
                        geminiApiKey={geminiApiKey}
                        geminiModel={geminiModel}
                        canUseAI={isUserCanUseAI}
                        teams={teams}
                    />
                )}
                {activeTab === 'meetings' && <MeetingMinutes db={db} user={user} canAccessAll={isUserPrivileged} isAdmin={isUserAdmin} isRootAdmin={isUserAdmin} geminiApiKey={geminiApiKey} geminiModel={geminiModel} canUseAI={isUserCanUseAI} teams={teams} />}
                {activeTab === 'settings' && (
                    canAccessSettings ? (
                        <SettingsPage db={db} user={user} isAdmin={isUserAdmin} isEditor={isUserEditor} cloudAdmins={cloudAdmins} cloudEditors={cloudEditors} cloudAIUsers={cloudAIUsers} rootAdmins={ROOT_ADMINS} onSaveGeminiSettings={handleSaveGeminiSettings} testConfig={testConfig} geminiApiKey={geminiApiKey} geminiModel={geminiModel} teams={teams} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <ShieldAlert size={48} className="mb-4" />
                            <h2 className="text-xl font-bold text-slate-600">權限不足</h2>
                            <p>您沒有權限存取系統設定頁面。</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
};


export { App, ErrorBoundary };
