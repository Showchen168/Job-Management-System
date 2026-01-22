/**
 * Job Management System - Main Application
 * 重構版本 v3.0.0
 * Creator: Show
 */

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, setDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from 'firebase/auth';

import {
    CheckCircle2, Clock, AlertCircle, Calendar, Users, FileText, Settings, Plus, Save, X, Edit2, Trash2, ChevronRight, Database, RefreshCw, Check, Download, Search, LogIn, LogOut, UserPlus, Loader2, ExternalLink, ShieldCheck, Lock, UserCog, Info, User, Filter, Briefcase, LayoutDashboard, BarChart3, Sparkles, Bot, Copy
} from 'lucide-react';

// Components
import Button from './components/Button';
import { Card, CardWithHeader } from './components/Card';
import { Input, Select, Textarea } from './components/Input';
import Modal from './components/Modal';
import Badge from './components/Badge';

// --- Constants ---
const SYSTEM_CREATOR = "Show";
const APP_VERSION = "v3.0.0";
const ON_GOING_KEYWORDS = ["on-going", "ongoing", "進行"];
const AIVRES_EMAIL_DOMAIN = "@aivres.com";

// --- Firebase Configuration ---
const DEFAULT_CONFIG = {
    apiKey: "AIzaSyAGezrKXfKSwvh1Aauy-wrTr53e_WtuXVE",
    authDomain: "job-management-system-16741.firebaseapp.com",
    projectId: "job-management-system-16741",
    storageBucket: "job-management-system-16741.firebasestorage.app",
    messagingSenderId: "1042345096032",
    appId: "1:1042345096032:web:853c2d9c35c06b7dd9a405",
    measurementId: "G-FM8QW4LJ2T"
};

const ROOT_ADMINS = ["showchen@aivres.com"];

// Helper Functions
const checkIsAdmin = (user, cloudAdmins = []) => {
    if (!user || !user.email) return false;
    return ROOT_ADMINS.includes(user.email) || cloudAdmins.includes(user.email);
};

const formatEmailPrefix = (email) => {
    if (!email) return '使用者';
    const [prefix] = email.split('@');
    return prefix || email;
};

const isOnGoingStatus = (status) => {
    if (!status) return false;
    const normalized = status.trim().toLowerCase();
    return ON_GOING_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const formatLocalDate = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Custom Hooks
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

// Error Boundary Component
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

// Auth Page Component
const AuthPage = ({ onLogin, onRegister, loading, error }) => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (mode === 'login') {
            onLogin(email, password);
        } else {
            onRegister(email, password);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="p-4 bg-blue-100 rounded-full inline-block mb-4">
                        <Briefcase className="text-blue-600" size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">工作紀錄中心</h1>
                    <p className="text-slate-500 text-sm mt-2">Job Management System {APP_VERSION}</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="your@email.com"
                            required
                            data-testid="login-email"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="••••••••"
                            required
                            data-testid="login-password"
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        loading={loading}
                        data-testid="login-submit"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : mode === 'login' ? (
                            <><LogIn size={20} /> 登入</>
                        ) : (
                            <><UserPlus size={20} /> 註冊</>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                        className="text-blue-600 hover:underline text-sm"
                    >
                        {mode === 'login' ? '沒有帳號？立即註冊' : '已有帳號？登入'}
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
                    Creator: {SYSTEM_CREATOR} | Version: {APP_VERSION}
                </div>
            </div>
        </div>
    );
};

// Navigation Button Component
const NavButton = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${active
            ? 'bg-blue-600 text-white'
            : 'text-slate-600 hover:bg-slate-100'
            }`}
    >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
    </button>
);

// Dashboard Component
const Dashboard = ({ tasks, user }) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status?.includes('完成') || t.status?.includes('Done')).length;
    const ongoingTasks = tasks.filter(t => isOnGoingStatus(t.status)).length;
    const pendingTasks = totalTasks - completedTasks - ongoingTasks;

    const stats = [
        { label: '總任務數', value: totalTasks, icon: Briefcase, color: 'blue' },
        { label: '進行中', value: ongoingTasks, icon: Clock, color: 'amber' },
        { label: '待處理', value: pendingTasks, icon: AlertCircle, color: 'slate' },
        { label: '已完成', value: completedTasks, icon: CheckCircle2, color: 'emerald' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">儀表板</h1>
                <p className="text-sm text-slate-500">歡迎回來，{formatEmailPrefix(user?.email)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.label} className="p-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                                <stat.icon className={`text-${stat.color}-600`} size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                                <p className="text-sm text-slate-500">{stat.label}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">最近任務</h2>
                {tasks.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">尚無任務</p>
                ) : (
                    <div className="space-y-3">
                        {tasks.slice(0, 5).map((task, index) => (
                            <div key={task.id || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isOnGoingStatus(task.status) ? 'bg-amber-500' : 'bg-slate-300'
                                        }`} />
                                    <span className="font-medium text-slate-700">{task.title}</span>
                                </div>
                                <Badge variant={isOnGoingStatus(task.status) ? 'warning' : 'default'}>
                                    {task.status || '未設定'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

// Task Manager Component (Simplified)
const TaskManager = ({ tasks, onAddTask, onUpdateTask, onDeleteTask, user, isAdmin }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTasks = tasks.filter(task =>
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assignee?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">任務管理</h1>
                <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>
                    新增任務
                </Button>
            </div>

            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="搜尋任務..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <Card className="overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">標題</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">負責人</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">狀態</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">截止日</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                    尚無任務資料
                                </td>
                            </tr>
                        ) : (
                            filteredTasks.map((task) => (
                                <tr key={task.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-800">{task.title}</td>
                                    <td className="px-4 py-3 text-slate-600">{task.assignee || '-'}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={isOnGoingStatus(task.status) ? 'warning' : 'default'}>
                                            {task.status || '未設定'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{task.dueDate || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setEditingTask(task)}
                                            className="p-1 text-slate-400 hover:text-blue-600"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteTask(task.id)}
                                            className="p-1 text-slate-400 hover:text-red-600 ml-2"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>

            {/* Task Form Modal would go here */}
        </div>
    );
};

// Settings Page Component
const SettingsPage = ({ user, isAdmin, geminiApiKey, onSaveApiKey }) => {
    const [apiKey, setApiKey] = useState(geminiApiKey || '');

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">系統設定</h1>

            <Card className="p-6" data-testid="gemini-settings">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Sparkles className="text-purple-600" size={20} />
                    AI 功能設定
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="輸入你的 Gemini API Key"
                            data-testid="gemini-api-key-input"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            請至 Google AI Studio 取得 API Key
                        </p>
                    </div>
                    <Button variant="primary" onClick={() => onSaveApiKey(apiKey)} data-testid="gemini-api-key-save-button">
                        <Save size={16} /> 儲存設定
                    </Button>
                </div>
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User className="text-blue-600" size={20} />
                    帳號資訊
                </h2>
                <div className="space-y-2 text-sm">
                    <p><span className="text-slate-500">Email：</span>{user?.email}</p>
                    <p><span className="text-slate-500">權限：</span>{isAdmin ? '管理員' : '一般使用者'}</p>
                </div>
            </Card>
        </div>
    );
};

// Main Application Component
function App() {
    // Firebase State
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);

    // Auth State
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState('');

    // App State
    const [activePage, setActivePage] = useState('dashboard');
    const [tasks, setTasks] = useState([]);
    const [cloudAdmins, setCloudAdmins] = useState([]);
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [testMode, setTestMode] = useState(false);

    // Check for Test Mode
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const isTestMode = params.get('testMode') === '1';
        setTestMode(isTestMode);

        if (params.get('testAuth') === '1' && !user) {
            // Mock Login for Testing
            setUser({
                email: params.get('testUserEmail') || 'test@example.com',
                uid: 'test-user-id',
                emailVerified: true
            });
            setAuthLoading(false);
        }
    }, []);

    // Modal
    const { modalConfig, showModal, hideModal, showError, showSuccess, showConfirm } = useModal();

    const isAdmin = checkIsAdmin(user, cloudAdmins);

    // Initialize Firebase
    useEffect(() => {
        try {
            const firebaseApp = getApps().length ? getApp() : initializeApp(DEFAULT_CONFIG);
            const firestore = getFirestore(firebaseApp);
            const firebaseAuth = getAuth(firebaseApp);

            setApp(firebaseApp);
            setDb(firestore);
            setAuth(firebaseAuth);
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }, []);

    // Auth State Listener
    useEffect(() => {
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            // If in test mode with mocked user, don't overwrite with null from firebase
            // unless we strictly want to follow firebase auth
            // But for this simple test, if we have a mocked user, we might want to keep it?
            // Actually, usually testAuth suppresses real auth listener or we mock the auth listener.
            // But let's assume standard behavior:
            setUser(currentUser);
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);

    // Load Tasks
    useEffect(() => {
        if (!db || !user) return;

        const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTasks(tasksData);
        });

        return () => unsubscribe();
    }, [db, user]);

    // Load Settings
    useEffect(() => {
        if (!db) return;

        const loadSettings = async () => {
            try {
                const configDoc = await getDoc(doc(db, 'config', 'permissions'));
                if (configDoc.exists()) {
                    setCloudAdmins(configDoc.data()?.admins?.list || []);
                }

                const aiConfigDoc = await getDoc(doc(db, 'config', 'ai'));
                if (aiConfigDoc.exists()) {
                    setGeminiApiKey(aiConfigDoc.data()?.geminiApiKey || '');
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        };

        loadSettings();
    }, [db]);

    // Auth Handlers
    const handleLogin = async (email, password) => {
        if (!auth) return;
        setAuthLoading(true);
        setAuthError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setAuthError(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleRegister = async (email, password) => {
        if (!auth) return;
        setAuthLoading(true);
        setAuthError('');

        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setAuthError(error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (error) {
            showError('登出失敗', error.message);
        }
    };

    // Task Handlers
    const handleAddTask = async (taskData) => {
        if (!db || !user) return;
        try {
            await addDoc(collection(db, 'tasks'), {
                ...taskData,
                createdAt: serverTimestamp(),
                createdByEmail: user.email
            });
            showSuccess('成功', '任務已新增');
        } catch (error) {
            showError('新增失敗', error.message);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!db) return;
        showConfirm('確認刪除', '確定要刪除此任務嗎？', async () => {
            try {
                await deleteDoc(doc(db, 'tasks', taskId));
                showSuccess('成功', '任務已刪除');
            } catch (error) {
                showError('刪除失敗', error.message);
            }
        });
    };

    const handleSaveApiKey = async (apiKey) => {
        if (!db) return;
        try {
            await setDoc(doc(db, 'config', 'ai'), { geminiApiKey: apiKey }, { merge: true });
            setGeminiApiKey(apiKey);
            showSuccess('成功', 'API Key 已儲存');
        } catch (error) {
            showError('儲存失敗', error.message);
        }
    };

    // Navigation Items
    const navItems = [
        { id: 'dashboard', label: '儀表板', icon: LayoutDashboard },
        { id: 'tasks', label: '任務管理', icon: Briefcase },
        { id: 'meetings', label: '會議記錄', icon: Users },
        { id: 'settings', label: '系統設定', icon: Settings },
    ];

    // Render Active Page
    const renderPage = () => {
        switch (activePage) {
            case 'dashboard':
                return <Dashboard tasks={tasks} user={user} />;
            case 'tasks':
                return (
                    <TaskManager
                        tasks={tasks}
                        onAddTask={handleAddTask}
                        onDeleteTask={handleDeleteTask}
                        user={user}
                        isAdmin={isAdmin}
                    />
                );
            case 'settings':
                return (
                    <SettingsPage
                        user={user}
                        isAdmin={isAdmin}
                        geminiApiKey={geminiApiKey}
                        onSaveApiKey={handleSaveApiKey}
                    />
                );
            default:
                return <Dashboard tasks={tasks} user={user} />;
        }
    };

    return (
        <ErrorBoundary>
            {authLoading ? (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                        <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
                        <p className="text-slate-500">載入中...</p>
                    </div>
                </div>
            ) : !user ? (
                <AuthPage
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    loading={authLoading}
                    error={authError}
                />
            ) : (
                <div className="min-h-screen flex bg-slate-50" data-testid="app-shell">
                    {/* Sidebar */}
                    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col">
                        <div className="flex items-center gap-3 px-4 py-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Briefcase className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-800">工作紀錄中心</h1>
                                <p className="text-xs text-slate-400">{APP_VERSION}</p>
                            </div>
                        </div>

                        <nav className="flex-1 space-y-1">
                            {navItems.map((item) => (
                                <NavButton
                                    key={item.id}
                                    icon={item.icon}
                                    label={item.label}
                                    active={activePage === item.id}
                                    onClick={() => setActivePage(item.id)}
                                />
                            ))}
                        </nav>

                        <div className="mt-auto pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="p-2 bg-slate-100 rounded-full">
                                    <User className="text-slate-600" size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                        {formatEmailPrefix(user.email)}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {isAdmin ? '管理員' : '成員'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                    title="登出"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 p-8 overflow-auto">
                        {renderPage()}
                    </main>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                content={modalConfig.content}
                type={modalConfig.type}
                onConfirm={modalConfig.onConfirm || hideModal}
                onCancel={modalConfig.onCancel}
                confirmText={modalConfig.confirmText}
            />

            {testMode && (
                <div
                    data-testid="firebase-status"
                    className="fixed bottom-0 right-0 m-4 bg-black/80 text-white px-3 py-1 rounded text-xs flex gap-2 z-50 pointer-events-none"
                >
                    <span>Firebase 連線狀態: {app ? 'Ready' : 'Initializing'}</span>
                    <span>測試模式: On</span>
                </div>
            )}
        </ErrorBoundary>
    );
}

export default App;
