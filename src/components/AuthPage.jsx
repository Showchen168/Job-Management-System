import React, { useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode
} from 'firebase/auth';
import { AlertCircle, Database, Loader2, CheckCircle2 } from 'lucide-react';
import logger from '../utils/logger';

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
            logger.error("Auth Error:", err);
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
            logger.error("Reset Email Error:", err);
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
            logger.error("Confirm Reset Error:", err);
            let msg = err.message;
            if (err.code === 'auth/expired-action-code') msg = '重設連結已過期，請重新申請';
            if (err.code === 'auth/invalid-action-code') msg = '重設連結無效，請重新申請';
            if (err.code === 'auth/weak-password') msg = '密碼太短 (至少6位)';
            setResetError(msg);
        }
        setResetLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#f6f5f4] px-4 py-6 md:px-8 md:py-10">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
                <section className="w-full overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)]" data-testid="auth-card">
                    <div className="bg-[#31302e] px-8 py-9 text-center">
                        <div className="mb-4 inline-flex rounded-full bg-[#f2f9ff] p-4 text-[#0075de] shadow-[0_12px_30px_rgba(0,117,222,0.18)]">
                            <Database size={32} />
                        </div>
                        <h1 className="text-2xl font-bold tracking-[-0.03em] text-white">工作紀錄中心</h1>
                        <p className="mt-2 text-sm text-[#d4d0cc]">請登入以存取您的工作資料</p>
                        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs text-[#ebe7e2]" data-testid="firebase-status-auth">
                            <span className="inline-block h-2 w-2 rounded-full bg-[#62aef0]" />
                            Firebase 連線狀態：{connectionStatus}
                        </p>
                    </div>
                    <div className="mx-auto w-full max-w-md">
                        <div className="p-8">
                        {error && <div className="mb-4 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" />{error}</div>}
                        {!showForgot && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Email 信箱</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full rounded-2xl border border-black/10 bg-[#fcfcfb] px-4 py-3.5 outline-none transition focus:border-[#0075de] focus:ring-2 focus:ring-[#097fe8]/15"
                                        placeholder={isLogin ? 'name@company.com' : '輸入完整 Email 地址'}
                                        value={isLogin ? email : emailPrefix}
                                        onChange={(e) => isLogin ? setEmail(e.target.value) : setEmailPrefix(e.target.value)}
                                        data-testid="login-email"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">密碼</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full rounded-2xl border border-black/10 bg-[#fcfcfb] px-4 py-3.5 outline-none transition focus:border-[#0075de] focus:ring-2 focus:ring-[#097fe8]/15"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        data-testid="login-password"
                                    />
                                </div>
                                {authError && <div className="flex items-center gap-1 text-sm text-red-500"><AlertCircle size={14} /> {authError}</div>}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0075de] px-4 py-3.5 font-bold text-white transition hover:bg-[#005bab] disabled:opacity-50"
                                    data-testid="login-submit"
                                >
                                    {loading && <Loader2 size={18} className="animate-spin" />}{isLogin ? '登入系統' : '註冊帳號'}
                                </button>
                                {isLogin && <button type="button" onClick={() => { setShowForgot(true); setAuthError(''); setResetMessage(''); setResetError(''); }} className="w-full text-sm text-[#0075de] hover:underline">忘記密碼？</button>}
                            </form>
                        )}
                        {showForgot && (
                            <form onSubmit={resetCode ? handleConfirmReset : (e) => { e.preventDefault(); handleSendResetEmail(); }} className="space-y-4">
                                {!resetCode && (
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">重設信箱</label>
                                        <input type="email" required className="w-full rounded-2xl border border-black/10 bg-[#fcfcfb] px-4 py-3.5 outline-none transition focus:border-[#0075de] focus:ring-2 focus:ring-[#097fe8]/15" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                                        <p className="mt-2 text-xs text-slate-500">系統將寄出重設密碼信件。</p>
                                    </div>
                                )}
                                {resetCode && (
                                    <>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">新密碼</label>
                                            <input type="password" required className="w-full rounded-2xl border border-black/10 bg-[#fcfcfb] px-4 py-3.5 outline-none transition focus:border-[#0075de] focus:ring-2 focus:ring-[#097fe8]/15" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">確認新密碼</label>
                                            <input type="password" required className="w-full rounded-2xl border border-black/10 bg-[#fcfcfb] px-4 py-3.5 outline-none transition focus:border-[#0075de] focus:ring-2 focus:ring-[#097fe8]/15" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                        </div>
                                    </>
                                )}
                                {resetMessage && <div className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 size={14} /> {resetMessage}</div>}
                                {resetError && <div className="flex items-center gap-1 text-sm text-red-500"><AlertCircle size={14} /> {resetError}</div>}
                                <button type="submit" disabled={resetLoading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0075de] px-4 py-3.5 font-bold text-white transition hover:bg-[#005bab] disabled:opacity-50">{resetLoading && <Loader2 size={18} className="animate-spin" />}{resetCode ? '更新密碼' : '寄送重設信件'}</button>
                                <button type="button" onClick={() => { setShowForgot(false); setResetMessage(''); setResetError(''); setResetCode(''); }} className="w-full text-sm text-slate-500 hover:underline">返回登入</button>
                            </form>
                        )}
                        <div className="mt-6 border-t border-black/10 pt-5 text-center text-sm text-slate-500">
                            {isLogin ? '還沒有帳號？' : '已經有帳號了？'}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setAuthError('');
                                    setEmail('');
                                    setEmailPrefix('');
                                }}
                                className="ml-2 font-bold text-[#0075de] hover:underline"
                            >
                                {isLogin ? '立即註冊' : '返回登入'}
                            </button>
                        </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AuthPage;
