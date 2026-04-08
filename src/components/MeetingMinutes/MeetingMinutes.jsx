import React, { useState, useEffect, useMemo } from 'react';
import {
    collection, collectionGroup, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp
} from 'firebase/firestore';
import {
    Plus, Search, Download, Loader2, Sparkles
} from 'lucide-react';
import MeetingForm from './MeetingForm';
import MeetingRow from './MeetingRow';
import Modal from '../common/Modal';
import AIConversationModal from '../AIConversationModal';
import { useTeamAccess } from '../../hooks/useTeamAccess';
import { getTeamLeaders } from '../../utils/permissions';
import logger from '../../utils/logger';

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

    const { isLeader, isRegularMember, userSelectableTeams, filterableTeams } = useTeamAccess(user, teams, canAccessAll);

    useEffect(() => {
        if (!db || !user) return;
        const q = canAccessAll
            ? query(collectionGroup(db, 'meetings'))
            : query(collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'meetings'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, path: doc.ref.path, ...doc.data() }));
        data.sort((a, b) => (new Date(b.date) - new Date(a.date)));
        setMeetings(data);
        }, (error) => logger.error(error));
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
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold text-slate-800">會議記錄工具</h2>{canAccessAll && <span className={`text-xs px-2 py-1 rounded-full font-bold ${isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{isAdmin ? 'Admin View' : 'Editor View'}</span>}</div>
                <button onClick={() => { setCurrentMeeting(null); setIsEditing(true); }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0075de] px-4 py-2 text-sm text-white shadow-md transition hover:bg-[#005bab] sm:w-auto"><Plus size={16} /> 新增</button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm sm:w-auto"><Search size={16} className="text-slate-400" /><input className="w-full min-w-0 bg-transparent text-sm outline-none sm:w-32" placeholder="搜尋..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                {!isRegularMember && <select className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm sm:w-auto" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="All">全部分類</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>}
                {!isRegularMember && <select className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm sm:w-auto" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}><option value="All">全部團隊</option>{filterableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
                {(isAdmin || canUseAI) && <button onClick={handleGenerateMeetingReport} className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-purple-700 sm:w-auto">{aiLoading ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} />} AI 總結</button>}
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

export default MeetingMinutes;
