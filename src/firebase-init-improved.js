// Improved Firebase initialization with better error handling
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { DEFAULT_CONFIG } from './constants';
import logger from './utils/logger';

/**
 * 改进的Firebase初始化函数
 * - 添加详细的错误日志
 * - 验证Firestore连接
 * - 自动创建必要的文档
 */
export const initFirebaseImproved = async (setters) => {
    const { setAppInstance, setAuth, setDb, setConnectionStatus, setError, setIsAuthChecking } = setters;

    try {
        logger.log('[Firebase] Starting initialization...');

        // Step 1: Initialize Firebase App
        const APP_NAME = 'work-tracker-app';
        let app;
        const existingApp = getApps().find(app => app.name === APP_NAME);

        if (existingApp) {
            logger.log('[Firebase] Using existing app instance');
            app = existingApp;
        } else {
            logger.log('[Firebase] Creating new app instance');
            app = initializeApp(DEFAULT_CONFIG, APP_NAME);
        }

        logger.log('[Firebase] App initialized:', {
            name: app.name,
            projectId: app.options.projectId
        });

        // Step 2: Initialize Auth
        logger.log('[Firebase] Initializing Auth...');
        const authInstance = getAuth(app);

        // Step 3: Initialize Firestore
        logger.log('[Firebase] Initializing Firestore...');
        const dbInstance = getFirestore(app);

        // Step 4: Test Firestore connection
        logger.log('[Firebase] Testing Firestore connection...');
        const testDocRef = doc(dbInstance, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'connection');

        try {
            const docSnap = await getDoc(testDocRef);

            if (docSnap.exists()) {
                logger.log('[Firebase] Connection document exists');
                logger.log('[Firebase] Document data:', docSnap.data());
            } else {
                logger.warn('[Firebase] Connection document does not exist, creating...');

                // Try to create the document
                try {
                    await setDoc(testDocRef, {
                        status: 'online',
                        lastUpdated: new Date().toISOString(),
                        createdBy: 'auto-init'
                    });
                    logger.log('[Firebase] Connection document created');
                } catch (createErr) {
                    logger.error('[Firebase] Could not create connection document:', createErr.message);
                    logger.error('[Firebase] Error code:', createErr.code);

                    if (createErr.code === 'permission-denied') {
                        logger.error('[Firebase] Permission denied. Please check Firestore Security Rules.');
                        logger.error('[Firebase] Make sure the rules allow read/write access to /artifacts/work-tracker-v1/public/**');
                    }
                }
            }

            logger.log('[Firebase] Firestore connection successful');
        } catch (testErr) {
            logger.error('[Firebase] Firestore connection test failed:', testErr.message);
            logger.error('[Firebase] Error code:', testErr.code);

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

        logger.log('[Firebase] Initialization complete');
        return { app, auth: authInstance, db: dbInstance };

    } catch (err) {
        logger.error('[Firebase] Initialization failed:', err);
        logger.error('[Firebase] Error details:', {
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
                logger.log(`[Firebase] Creating document: ${path.join('/')}`);
                await setDoc(docRef, data);
                logger.log(`[Firebase] Document created: ${path.join('/')}`);
            }
        } catch (err) {
            logger.error(`[Firebase] Could not ensure document ${path.join('/')}: ${err.message}`);
        }
    }
};
