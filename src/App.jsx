import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import * as OpenCC from 'opencc-js';
import {
    CheckCircle2, AlertCircle, Users, Settings, Database,
    LogOut, Loader2, ShieldCheck, ShieldAlert, Menu, X, Clock,
    LayoutDashboard
} from 'lucide-react';

import { DEFAULT_CONFIG, ROOT_ADMINS, SYSTEM_CREATOR, APP_VERSION, LOCALE_STORAGE_KEY, DEFAULT_LOCALE } from './constants';
import { checkIsAdmin, checkIsEditor, checkCanUseAI, checkIsLeader, checkIsInAnyTeam, formatEmailPrefix } from './utils/permissions';
import { applyLocaleToDocument } from './utils/helpers';
import logger from './utils/logger';

import ErrorBoundary from './components/common/ErrorBoundary';
import NavButton from './components/common/NavButton';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import TaskManager from './components/TaskManager/TaskManager';
import MeetingMinutes from './components/MeetingMinutes/MeetingMinutes';
import IssueManager from './components/IssueManager/IssueManager';
import SettingsPage from './components/SettingsPage';

const App = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 768);
    const localeConvertersRef = useRef(null);
    const originalLocaleTextRef = useRef(new WeakMap());
    const isLocaleUpdatingRef = useRef(false);

    const testConfig = useMemo(() => {
        if (!import.meta.env.DEV) return { enabled: false, userEmail: null, forceAuthPage: false };
        const params = new URLSearchParams(window.location.search);
        return {
            enabled: params.get('testMode') === '1',
            userEmail: params.get('testUserEmail'),
            forceAuthPage: params.get('testAuth') === '1'
        };
    }, []);

    // Firebase initialization
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
                const existingApp = getApps().find(a => a.name === APP_NAME);
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
                logger.error("Firebase Init Error:", err);
                setError(`連線錯誤: ${err.message}`);
                setConnectionStatus('連線錯誤');
                setIsAuthChecking(false);
            }
        };
        initFirebase();
    }, [testConfig.enabled, testConfig.userEmail]);

    // OpenCC converter initialization
    useEffect(() => {
        if (!OpenCC) return;
        if (!localeConvertersRef.current) {
            localeConvertersRef.current = {
                toSimplified: OpenCC.Converter({ from: 'tw', to: 'cn' }),
                toTraditional: OpenCC.Converter({ from: 'cn', to: 'tw' })
            };
        }
    }, []);

    // Locale change handler
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

    // Firestore connection status
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
                logger.error("Firebase Connection Error:", err);
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

    // Cloud admins subscription
    useEffect(() => {
        if (!db) return;
        const ref = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'admins');
        return onSnapshot(ref, (snap) => setCloudAdmins(snap.exists() && snap.data().list ? snap.data().list : []));
    }, [db]);

    // Cloud editors subscription
    useEffect(() => {
        if (!db) return;
        const ref = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'editors');
        return onSnapshot(ref, (snap) => setCloudEditors(snap.exists() && snap.data().list ? snap.data().list : []));
    }, [db]);

    // Cloud AI users subscription
    useEffect(() => {
        if (!db) return;
        const ref = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'aiUsers');
        return onSnapshot(ref, (snap) => setCloudAIUsers(snap.exists() && snap.data().list ? snap.data().list : []));
    }, [db]);

    // Teams subscription
    useEffect(() => {
        if (!db) return;
        const ref = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
        return onSnapshot(ref, (snap) => setTeams(snap.exists() && snap.data().list ? snap.data().list : []));
    }, [db]);

    // Gemini settings subscription
    useEffect(() => {
        if (!db || testConfig.enabled) return;
        const ref = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'gemini');
        return onSnapshot(
            ref,
            (snap) => {
                if (snap.exists()) {
                    setGeminiApiKey(snap.data().apiKey || '');
                    setGeminiModel(snap.data().model || 'gemini-2.5-flash');
                } else {
                    setGeminiApiKey('');
                    setGeminiModel('gemini-2.5-flash');
                }
            },
            (err) => {
                logger.error('Gemini settings error:', err);
                setGeminiApiKey('');
            }
        );
    }, [db, testConfig.enabled]);

    // User registration
    useEffect(() => {
        if (testConfig.enabled || !db || !user?.uid) return;
        const registerUser = async () => {
            try {
                const userRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users', user.uid);
                const snapshot = await getDoc(userRef);
                const existingData = snapshot.exists() ? snapshot.data() : {};
                const resolvedEmail = user.email || existingData.email;
                const payload = { uid: user.uid, lastSeen: serverTimestamp(), lastLoginAt: serverTimestamp() };
                if (resolvedEmail) payload.email = resolvedEmail;
                if (!existingData.createdAt) payload.createdAt = serverTimestamp();
                await setDoc(userRef, payload, { merge: true });
            } catch (e) {
                logger.error("User Registry Error:", e);
            }
        };
        registerUser();
    }, [db, user, testConfig.enabled]);

    // Close mobile menu on tab change
    useEffect(() => { setIsMobileMenuOpen(false); }, [activeTab]);

    // Viewport resize listener
    useEffect(() => {
        const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Body overflow for mobile menu
    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

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
            { apiKey: key, model, updatedAt: serverTimestamp(), updatedBy: user?.email || null },
            { merge: true }
        );
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
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
                            <span className="text-amber-700">Doris Kuo or Team Leader</span>
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">系統管理員會盡快為您配置團隊權限</p>
                    {!testConfig.enabled && auth && (
                        <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition font-medium">
                            <LogOut size={18} /> 登出
                        </button>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-6">System Creator: {SYSTEM_CREATOR} | Version: {APP_VERSION}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f6f5f4] font-sans text-slate-800 md:flex" data-testid="app-shell">
            {isMobileMenuOpen && (
                <button type="button" aria-label="關閉選單" className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] md:hidden" onClick={() => setIsMobileMenuOpen(false)} data-testid="mobile-sidebar-overlay" />
            )}
            <aside
                className="fixed inset-y-0 left-0 z-50 w-[min(86vw,20rem)] border-r border-black/10 bg-[#fbfaf8] transition-transform duration-200 md:static md:min-h-screen md:w-72 md:border-b-0"
                style={{
                    left: isMobileViewport && !isMobileMenuOpen ? 'calc(min(86vw, 20rem) * -1 - 1px)' : undefined,
                    transform: isMobileViewport ? 'translateX(0)' : undefined
                }}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 md:hidden">
                        <div className="flex items-center gap-2 text-base font-bold text-slate-900">
                            <Database className="text-[#0075de]" size={18} /> 工作紀錄中心
                        </div>
                        <button type="button" aria-label="關閉選單" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500" onClick={() => setIsMobileMenuOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6">
                        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">
                            <Database className="text-[#0075de]" /> 工作紀錄中心
                            <span className="text-xs font-normal text-slate-400">{APP_VERSION}</span>
                        </h1>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] text-slate-500 shadow-sm" data-testid="firebase-status">
                            <span className={`inline-block h-2 w-2 rounded-full ${connectionIndicatorClass}`} />
                            <span>Firebase 連線狀態：{connectionStatus}</span>
                        </div>
                    </div>
                    <nav className="flex-1 space-y-2 px-4 pb-4" aria-label="主要導覽">
                        <NavButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<LayoutDashboard size={20} />} label="數據看板" />
                        <NavButton active={activeTab === 'tasks'} onClick={() => handleTabChange('tasks')} icon={<CheckCircle2 size={20} />} label="待辦事項" />
                        <NavButton active={activeTab === 'issues'} onClick={() => handleTabChange('issues')} icon={<AlertCircle size={20} />} label="問題管理" />
                        <NavButton active={activeTab === 'meetings'} onClick={() => handleTabChange('meetings')} icon={<Users size={20} />} label="會議記錄" />
                    </nav>
                    <div className="mx-4 mb-4 rounded-[24px] border border-black/10 bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-[#eef6ff] text-[#0075de] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {userDisplayName ? userDisplayName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="overflow-hidden flex-1">
                                <div className="text-sm font-bold truncate text-slate-900" data-testid="user-display-name">{userDisplayName}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                    {isUserAdmin ? <span className="text-yellow-500 flex items-center gap-0.5"><ShieldCheck size={10}/> Admin</span>
                                     : isUserEditor ? <span className="text-blue-500 flex items-center gap-0.5"><ShieldCheck size={10}/> Editor</span>
                                     : isUserLeader ? <span className="text-teal-500 flex items-center gap-0.5"><ShieldCheck size={10}/> Leader</span>
                                     : 'User'}
                                </div>
                            </div>
                            {canAccessSettings && (
                                <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-xl transition flex-shrink-0 ${activeTab === 'settings' ? 'bg-[#0075de] text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`} title="系統設定">
                                    <Settings size={16} />
                                </button>
                            )}
                        </div>
                        {!testConfig.enabled && auth && (
                            <button onClick={() => signOut(auth)} className="w-full text-xs flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition">
                                <LogOut size={14} /> 登出
                            </button>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/10 text-[11px] text-slate-400" data-testid="locale-toggle">
                            <span>語系</span>
                            <button onClick={() => setLocale((prev) => (prev === 'zh-Hant' ? 'zh-Hans' : 'zh-Hant'))} className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition" data-testid="locale-toggle-button">
                                {locale === 'zh-Hant' ? '简体' : '繁體'}
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto md:h-screen" data-testid="workspace-shell">
                <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/10 bg-[#f6f5f4]/95 px-4 py-3 backdrop-blur md:hidden">
                    <div className="min-w-0">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">工作紀錄中心</div>
                        <div className="truncate text-base font-bold text-slate-900">
                            {activeTab === 'dashboard' && '數據看板'}
                            {activeTab === 'tasks' && '待辦事項'}
                            {activeTab === 'issues' && '問題管理'}
                            {activeTab === 'meetings' && '會議記錄'}
                            {activeTab === 'settings' && '系統設定'}
                        </div>
                    </div>
                    <button type="button" aria-label="開啟選單" className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm" onClick={() => setIsMobileMenuOpen(true)} data-testid="mobile-menu-button">
                        <Menu size={18} />
                    </button>
                </div>
                <div className="mx-auto max-w-7xl p-4 md:p-8">
                    {activeTab === 'dashboard' && <Dashboard db={db} user={user} canAccessAll={isUserPrivileged} isAdmin={isUserAdmin} />}
                    {activeTab === 'tasks' && (
                        <TaskManager db={db} user={user} canAccessAll={isUserPrivileged} isAdmin={isUserAdmin} testConfig={testConfig} geminiApiKey={geminiApiKey} geminiModel={geminiModel} canUseAI={isUserCanUseAI} teams={teams} />
                    )}
                    {activeTab === 'meetings' && <MeetingMinutes db={db} user={user} canAccessAll={isUserPrivileged} isAdmin={isUserAdmin} isRootAdmin={isUserAdmin} geminiApiKey={geminiApiKey} geminiModel={geminiModel} canUseAI={isUserCanUseAI} teams={teams} />}
                    {activeTab === 'issues' && <IssueManager db={db} user={user} canAccessAll={isUserPrivileged} isAdmin={isUserAdmin} teams={teams} geminiApiKey={geminiApiKey} geminiModel={geminiModel} canUseAI={isUserCanUseAI} />}
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
                </div>
            </main>
        </div>
    );
};

export { ErrorBoundary };
export default App;
