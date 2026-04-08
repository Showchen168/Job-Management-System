import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import { callGeminiAI, extractProgressByDateRange } from '../utils/helpers';
import { downloadAsWord } from './common/downloadAsWord';
import MarkdownRenderer from './common/MarkdownRenderer';
import CopyButton from './common/CopyButton';
import {
    Bot, Calendar, Loader2, Sparkles, Download, X
} from 'lucide-react';

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

    useEffect(() => {
        if (!rawData || !Array.isArray(rawData)) {
            setFilteredData(typeof rawData === 'string' ? rawData : '');
            return;
        }

        if (dataType === 'meetings') {
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
            const tasksWithProgress = rawData.map(t => {
                const filteredProgress = extractProgressByDateRange(t.progress, startDate, endDate);
                return { task: t, filteredProgress };
            }).filter(item => {
                if (!startDate && !endDate) return true;
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
            setAiResponse(resultRaw);
        } catch (e) {
            setError(e.message || '生成失敗，請稍後再試');
        }
        setIsLoading(false);
    };

    const handleDownloadWord = () => {
        if (aiResponse) {
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

    const dataCount = useMemo(() => {
        if (!Array.isArray(rawData)) return 0;
        if (!startDate && !endDate) return rawData.length;

        if (dataType === 'meetings') {
            return rawData.filter(item => {
                const itemDate = item.date;
                if (!itemDate) return false;
                const d = new Date(itemDate);
                if (startDate && d < new Date(startDate)) return false;
                if (endDate && d > new Date(endDate)) return false;
                return true;
            }).length;
        } else {
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

export default AIConversationModal;
