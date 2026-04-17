import React, { useState, useEffect, useMemo } from 'react';
import {
    collection, collectionGroup, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp
} from 'firebase/firestore';
import {
    Plus, Search, Filter
} from 'lucide-react';
import MeetingForm from './MeetingForm';
import MeetingRow from './MeetingRow';
import Modal from '../common/Modal';
import {
    StandardToolbar,
    StandardToolbarButton,
    StandardToolbarField,
    StandardToolbarInput,
    StandardToolbarSelect,
} from '../common/StandardToolbar';
import { useTeamAccess } from '../../hooks/useTeamAccess';
import { canPerformAction, getTeamLeaders } from '../../utils/permissions';
import logger from '../../utils/logger';

const MeetingMinutes = ({ db, user, canAccessAll, teams = [], permissionContext = null }) => {
    const [meetings, setMeetings] = useState([]);
    const [filteredMeetings, setFilteredMeetings] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMeeting, setCurrentMeeting] = useState(null);
    const [categories, setCategories] = useState(['內部會議', '客戶會議', '專案檢討']);
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterTeam, setFilterTeam] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const canCreateMeeting = canPerformAction(permissionContext, 'meeting.create');
    const canEditMeeting = canPerformAction(permissionContext, 'meeting.edit');
    const canDeleteMeeting = canPerformAction(permissionContext, 'meeting.delete');

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
        <StandardToolbar
            testId="meeting-toolbar"
            actions={(
                <StandardToolbarButton type="button" variant="primary" onClick={() => { setCurrentMeeting(null); setIsEditing(true); }} disabled={!canCreateMeeting}>
                    <Plus size={16} /> 新增
                </StandardToolbarButton>
            )}
        >
            <StandardToolbarField icon={<Search size={16} />}>
                <StandardToolbarInput className="sm:w-40" placeholder="搜尋..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </StandardToolbarField>
            {!isRegularMember && (
                <StandardToolbarField icon={<Filter size={16} />}>
                    <StandardToolbarSelect className="sm:w-28" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="All">全部分類</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</StandardToolbarSelect>
                </StandardToolbarField>
            )}
            {!isRegularMember && (
                <StandardToolbarField icon={<Filter size={16} />}>
                    <StandardToolbarSelect className="sm:w-32" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}><option value="All">全部團隊</option>{filterableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</StandardToolbarSelect>
                </StandardToolbarField>
            )}
        </StandardToolbar>
        {isEditing && (
            <MeetingForm initialData={currentMeeting} categories={categories} teams={userSelectableTeams} onSave={handleSave} onCancel={() => setIsEditing(false)} />
        )}
        <div className="space-y-4">
            {filteredMeetings.map(meeting => (
                <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    canEdit={canEditMeeting}
                    canDelete={canDeleteMeeting}
                    onEdit={() => { setCurrentMeeting(meeting); setIsEditing(true); }}
                    onDelete={() => confirmDelete(meeting)}
                />
            ))}
            {filteredMeetings.length === 0 && <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">沒有資料</div>}
        </div>
        </div>
    );
};

export default MeetingMinutes;
