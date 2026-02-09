// Firebase Connection Diagnostic Script
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, getDoc, connectFirestoreEmulator } from 'firebase/firestore';

const DEFAULT_CONFIG = {
    apiKey: "AIzaSyAGezrKXfKSwvh1Aauy-wrTr53e_WtuXVE",
    authDomain: "job-management-system-16741.firebaseapp.com",
    projectId: "job-management-system-16741",
    storageBucket: "job-management-system-16741.firebasestorage.app",
    messagingSenderId: "1042345096032",
    appId: "1:1042345096032:web:853c2d9c35c06b7dd9a405",
    measurementId: "G-FM8QW4LJ2T"
};

async function diagnoseFirebase() {
    console.log('========================================');
    console.log('Firebase Connection Diagnostic');
    console.log('========================================\n');

    // Step 1: Check configuration
    console.log('1. Checking Firebase configuration...');
    console.log('   Project ID:', DEFAULT_CONFIG.projectId);
    console.log('   Auth Domain:', DEFAULT_CONFIG.authDomain);
    console.log('   Storage Bucket:', DEFAULT_CONFIG.storageBucket);

    const missingFields = [];
    if (!DEFAULT_CONFIG.apiKey) missingFields.push('apiKey');
    if (!DEFAULT_CONFIG.authDomain) missingFields.push('authDomain');
    if (!DEFAULT_CONFIG.projectId) missingFields.push('projectId');
    if (!DEFAULT_CONFIG.appId) missingFields.push('appId');

    if (missingFields.length > 0) {
        console.error('   ❌ Missing fields:', missingFields.join(', '));
        return;
    }
    console.log('   ✅ Configuration is complete\n');

    // Step 2: Initialize Firebase App
    console.log('2. Initializing Firebase App...');
    let app;
    try {
        app = initializeApp(DEFAULT_CONFIG, 'diagnostic-app');
        console.log('   ✅ Firebase App initialized successfully');
        console.log('   App Name:', app.name);
        console.log('   Options:', JSON.stringify(app.options, null, 2));
    } catch (err) {
        console.error('   ❌ Failed to initialize Firebase App:', err.message);
        console.error('   Error code:', err.code);
        console.error('   Full error:', err);
        return;
    }
    console.log('');

    // Step 3: Initialize Auth
    console.log('3. Initializing Firebase Auth...');
    let auth;
    try {
        auth = getAuth(app);
        console.log('   ✅ Firebase Auth initialized successfully');
        console.log('   Current user:', auth.currentUser ? auth.currentUser.email : 'None');
    } catch (err) {
        console.error('   ❌ Failed to initialize Firebase Auth:', err.message);
        console.error('   Error code:', err.code);
    }
    console.log('');

    // Step 4: Initialize Firestore
    console.log('4. Initializing Firestore...');
    let db;
    try {
        db = getFirestore(app);
        console.log('   ✅ Firestore initialized successfully');
        console.log('   Firestore type:', db.type);
    } catch (err) {
        console.error('   ❌ Failed to initialize Firestore:', err.message);
        console.error('   Error code:', err.code);
    }
    console.log('');

    // Step 5: Test Firestore connection
    console.log('5. Testing Firestore connection...');
    if (db) {
        try {
            const testDocRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'connection');
            console.log('   Attempting to read document:', testDocRef.path);

            const docSnap = await getDoc(testDocRef);

            if (docSnap.exists()) {
                console.log('   ✅ Successfully connected to Firestore');
                console.log('   Document data:', JSON.stringify(docSnap.data(), null, 2));
                console.log('   From cache:', docSnap.metadata.fromCache);
                console.log('   Has pending writes:', docSnap.metadata.hasPendingWrites);
            } else {
                console.log('   ⚠️  Document does not exist (connection successful but document missing)');
                console.log('   From cache:', docSnap.metadata.fromCache);
            }
        } catch (err) {
            console.error('   ❌ Failed to connect to Firestore:', err.message);
            console.error('   Error code:', err.code);
            console.error('   Full error:', err);

            // Provide specific error guidance
            if (err.code === 'permission-denied') {
                console.log('\n   💡 Possible causes:');
                console.log('      - Firestore Security Rules are blocking access');
                console.log('      - User is not authenticated');
                console.log('      - Check Firebase Console > Firestore > Rules');
            } else if (err.code === 'unavailable') {
                console.log('\n   💡 Possible causes:');
                console.log('      - Network connection issues');
                console.log('      - Firebase service is down');
                console.log('      - Firewall blocking Firebase domains');
            } else if (err.code === 'not-found') {
                console.log('\n   💡 Possible causes:');
                console.log('      - Firestore database not created in Firebase Console');
                console.log('      - Wrong project ID');
            }
        }
    }
    console.log('');

    // Step 6: Check network connectivity
    console.log('6. Checking network connectivity...');
    console.log('   Online status:', navigator?.onLine ?? 'Unknown');

    try {
        // Test DNS resolution for Firebase domains
        const testDomains = [
            `https://${DEFAULT_CONFIG.authDomain}`,
            `https://firestore.googleapis.com`,
            'https://identitytoolkit.googleapis.com'
        ];

        for (const domain of testDomains) {
            try {
                const response = await fetch(domain, { method: 'HEAD', mode: 'no-cors' });
                console.log(`   ✅ Can reach: ${domain}`);
            } catch (err) {
                console.error(`   ❌ Cannot reach: ${domain} - ${err.message}`);
            }
        }
    } catch (err) {
        console.error('   ❌ Network check failed:', err.message);
    }
    console.log('');

    console.log('========================================');
    console.log('Diagnostic Complete');
    console.log('========================================');
}

// Run diagnostic
diagnoseFirebase().catch(err => {
    console.error('Diagnostic failed:', err);
});
