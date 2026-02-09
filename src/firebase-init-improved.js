// Improved Firebase initialization with better error handling
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const DEFAULT_CONFIG = {
    apiKey: "AIzaSyAGezrKXfKSwvh1Aauy-wrTr53e_WtuXVE",
    authDomain: "job-management-system-16741.firebaseapp.com",
    projectId: "job-management-system-16741",
    storageBucket: "job-management-system-16741.firebasestorage.app",
    messagingSenderId: "1042345096032",
    appId: "1:1042345096032:web:853c2d9c35c06b7dd9a405",
    measurementId: "G-FM8QW4LJ2T"
};

/**
 * 改进的Firebase初始化函数
 * - 添加详细的错误日志
 * - 验证Firestore连接
 * - 自动创建必要的文档
 */
export const initFirebaseImproved = async (setters) => {
    const { setAppInstance, setAuth, setDb, setConnectionStatus, setError, setIsAuthChecking } = setters;

    try {
        console.log('[Firebase] Starting initialization...');

        // Step 1: Initialize Firebase App
        const APP_NAME = 'work-tracker-app';
        let app;
        const existingApp = getApps().find(app => app.name === APP_NAME);

        if (existingApp) {
            console.log('[Firebase] Using existing app instance');
            app = existingApp;
        } else {
            console.log('[Firebase] Creating new app instance');
            app = initializeApp(DEFAULT_CONFIG, APP_NAME);
        }

        console.log('[Firebase] App initialized:', {
            name: app.name,
            projectId: app.options.projectId
        });

        // Step 2: Initialize Auth
        console.log('[Firebase] Initializing Auth...');
        const authInstance = getAuth(app);

        // Step 3: Initialize Firestore
        console.log('[Firebase] Initializing Firestore...');
        const dbInstance = getFirestore(app);

        // Step 4: Test Firestore connection
        console.log('[Firebase] Testing Firestore connection...');
        const testDocRef = doc(dbInstance, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'connection');

        try {
            const docSnap = await getDoc(testDocRef);

            if (docSnap.exists()) {
                console.log('[Firebase] ✅ Connection document exists');
                console.log('[Firebase] Document data:', docSnap.data());
            } else {
                console.warn('[Firebase] ⚠️ Connection document does not exist, creating...');

                // Try to create the document
                try {
                    await setDoc(testDocRef, {
                        status: 'online',
                        lastUpdated: new Date().toISOString(),
                        createdBy: 'auto-init'
                    });
                    console.log('[Firebase] ✅ Connection document created');
                } catch (createErr) {
                    console.error('[Firebase] ⚠️ Could not create connection document:', createErr.message);
                    console.error('[Firebase] Error code:', createErr.code);

                    if (createErr.code === 'permission-denied') {
                        console.error('[Firebase] 🔒 Permission denied. Please check Firestore Security Rules.');
                        console.error('[Firebase] Make sure the rules allow read/write access to /artifacts/work-tracker-v1/public/**');
                    }
                }
            }

            console.log('[Firebase] ✅ Firestore connection successful');
        } catch (testErr) {
            console.error('[Firebase] ❌ Firestore connection test failed:', testErr.message);
            console.error('[Firebase] Error code:', testErr.code);

            // Provide specific guidance based on error code
            if (testErr.code === 'permission-denied') {
                throw new Error('權限被拒：請檢查 Firestore 安全規則設定');
            } else if (testErr.code === 'unavailable') {
                throw new Error('無法連線：請檢查網路連線或 Firebase 服務狀態');
            } else if (testErr.code === 'not-found') {
                throw new Error('找不到資料庫：請確認 Firestore 已在 Firebase Console 中啟用');
            } else {
                throw new Error(`連線測試失敗: ${testErr.message}`);
            }
        }

        // Step 5: Set state
        setAppInstance(app);
        setAuth(authInstance);
        setDb(dbInstance);
        setConnectionStatus(navigator.onLine ? '連線中...' : '離線');

        console.log('[Firebase] ✅ Initialization complete');
        return { app, auth: authInstance, db: dbInstance };

    } catch (err) {
        console.error('[Firebase] ❌ Initialization failed:', err);
        console.error('[Firebase] Error details:', {
            message: err.message,
            code: err.code,
            stack: err.stack
        });

        setError(`連線錯誤: ${err.message}`);
        setConnectionStatus('連線錯誤');
        setIsAuthChecking(false);

        throw err;
    }
};

/**
 * 创建Firestore必要文档的辅助函数
 */
export const ensureFirestoreDocuments = async (db) => {
    const requiredDocs = [
        {
            path: ['artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'connection'],
            data: { status: 'online', lastUpdated: new Date().toISOString() }
        },
        {
            path: ['artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'admins'],
            data: { list: [] }
        },
        {
            path: ['artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'editors'],
            data: { list: [] }
        }
    ];

    for (const { path, data } of requiredDocs) {
        const docRef = doc(db, ...path);
        try {
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                console.log(`[Firebase] Creating document: ${path.join('/')}`);
                await setDoc(docRef, data);
                console.log(`[Firebase] ✅ Document created: ${path.join('/')}`);
            }
        } catch (err) {
            console.error(`[Firebase] ⚠️ Could not ensure document ${path.join('/')}: ${err.message}`);
        }
    }
};
