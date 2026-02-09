# Firebase 連線問題故障排除指南

## 📋 問題摘要

Firebase 連線失敗可能由以下原因造成：

1. **Firestore 數據庫未啟用**
2. **Firestore 安全規則配置不正確**
3. **必要的文檔不存在**
4. **網路連線問題**
5. **API 密鑰或配置錯誤**

---

## 🔍 診斷步驟

### 步驟 1: 檢查 Firebase Console

1. 前往 [Firebase Console](https://console.firebase.google.com/project/job-management-system-16741)
2. 登入並選擇項目 `job-management-system-16741`

### 步驟 2: 驗證 Firestore 數據庫

1. 在左側菜單中點擊 **"Firestore Database"**
2. 檢查數據庫是否已創建
   - 如果看到 "Get started" 按鈕，表示數據庫尚未創建
   - 點擊按鈕並選擇 **"Start in production mode"** 或 **"Start in test mode"**
   - 選擇區域（建議：asia-east1 或 us-central1）

### 步驟 3: 檢查並更新安全規則

1. 在 Firestore Database 頁面，點擊 **"Rules"** 標籤
2. 將規則更新為以下內容：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 允許讀取 public 路徑下的所有文檔
    match /artifacts/work-tracker-v1/public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null &&
                      request.auth.token.email.matches('.*@aivres\\.com$');
    }

    // 其他所有文檔需要身份驗證
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. 點擊 **"Publish"** 發布規則

### 步驟 4: 創建必要的文檔結構

使用 Firebase Console 手動創建以下文檔：

#### 4.1 連線狀態文檔
- **路徑**: `artifacts/work-tracker-v1/public/data/settings/connection`
- **數據**:
```json
{
  "status": "online",
  "lastUpdated": "2026-02-09T12:00:00.000Z"
}
```

#### 4.2 管理員列表文檔
- **路徑**: `artifacts/work-tracker-v1/public/data/settings/admins`
- **數據**:
```json
{
  "list": ["showchen@aivres.com"]
}
```

#### 4.3 編輯者列表文檔
- **路徑**: `artifacts/work-tracker-v1/public/data/settings/editors`
- **數據**:
```json
{
  "list": []
}
```

#### 4.4 AI 用戶列表文檔
- **路徑**: `artifacts/work-tracker-v1/public/data/settings/aiUsers`
- **數據**:
```json
{
  "list": []
}
```

### 步驟 5: 驗證 Authentication 設定

1. 在 Firebase Console 左側菜單點擊 **"Authentication"**
2. 點擊 **"Sign-in method"** 標籤
3. 確保 **"Email/Password"** 方式已啟用
4. 如果未啟用，點擊 "Email/Password" 並啟用它

---

## 🛠️ 快速修復選項

### 選項 A: 使用診斷腳本

運行診斷腳本來檢測問題：

```bash
# 使用 Node.js 運行診斷
node diagnose-firebase.js
```

診斷腳本會檢查：
- ✅ Firebase 配置完整性
- ✅ Firebase App 初始化
- ✅ Auth 初始化
- ✅ Firestore 初始化
- ✅ Firestore 連線測試
- ✅ 網路連線狀態

### 選項 B: 使用改進的初始化代碼

使用 `src/firebase-init-improved.js` 中的改進版初始化代碼：

```javascript
import { initFirebaseImproved, ensureFirestoreDocuments } from './firebase-init-improved';

// 在你的組件中
useEffect(() => {
    if (testConfig.enabled) {
        // 測試模式...
        return;
    }

    const initFirebase = async () => {
        try {
            const setters = {
                setAppInstance,
                setAuth,
                setDb,
                setConnectionStatus,
                setError,
                setIsAuthChecking
            };

            const { db } = await initFirebaseImproved(setters);

            // 確保所有必要的文檔存在
            await ensureFirestoreDocuments(db);

            // 設置 auth 監聽器
            onAuthStateChanged(auth, (u) => {
                setUser(u);
                setIsAuthChecking(false);
            });

        } catch (err) {
            console.error("Firebase initialization failed:", err);
        }
    };

    initFirebase();
}, [testConfig.enabled]);
```

---

## 🚨 常見錯誤及解決方案

### 錯誤 1: `permission-denied`

**症狀**: 控制台顯示 "Firebase Connection Error: permission-denied"

**原因**: Firestore 安全規則阻止訪問

**解決方案**:
1. 檢查 Firestore Rules（步驟 3）
2. 確保 `artifacts/work-tracker-v1/public/**` 路徑允許讀取
3. 如果需要寫入，確保用戶已登入

### 錯誤 2: `unavailable`

**症狀**: 控制台顯示 "Firebase Connection Error: unavailable"

**原因**:
- 網路連線問題
- Firebase 服務暫時不可用
- 防火牆阻擋

**解決方案**:
1. 檢查網路連線
2. 檢查是否能訪問 `https://firestore.googleapis.com`
3. 檢查防火牆設定
4. 嘗試使用 VPN 或不同的網路

### 錯誤 3: `not-found`

**症狀**: 控制台顯示 "Firebase Connection Error: not-found"

**原因**:
- Firestore 數據庫未創建
- 項目 ID 錯誤

**解決方案**:
1. 確認 Firestore 數據庫已在 Firebase Console 中創建（步驟 2）
2. 驗證 `projectId` 是否正確：`job-management-system-16741`

### 錯誤 4: 文檔不存在

**症狀**: 應用顯示 "離線（快取）" 或 "連線錯誤"

**原因**: 必要的 Firestore 文檔未創建

**解決方案**:
1. 按照步驟 4 創建所有必要的文檔
2. 或使用 `ensureFirestoreDocuments()` 函數自動創建

---

## 🔧 開發環境測試

### 使用測試模式

在開發時，可以使用測試模式繞過 Firebase：

```
http://localhost:5173/?testMode=1&testUserEmail=test@example.com
```

參數說明：
- `testMode=1` - 啟用測試模式
- `testUserEmail=test@example.com` - 設定測試用戶郵箱
- `testAuth=1` - 強制顯示登入頁面

---

## 📝 檢查清單

在聯繫技術支援前，請確認：

- [ ] Firestore 數據庫已在 Firebase Console 中創建
- [ ] Firestore 安全規則已正確配置
- [ ] 必要的文檔路徑已創建
- [ ] Authentication Email/Password 登入方式已啟用
- [ ] 網路可以訪問 Firebase 服務
- [ ] Firebase SDK 版本正確 (^12.8.0)
- [ ] API Key 和配置正確
- [ ] 瀏覽器控制台錯誤已記錄

---

## 🔗 相關連結

- [Firebase Console](https://console.firebase.google.com/project/job-management-system-16741)
- [Firestore 文檔](https://firebase.google.com/docs/firestore)
- [Firestore 安全規則](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

---

## 💡 其他提示

### 啟用持久化緩存

Firestore 支援離線持久化，即使在離線時也能訪問數據：

```javascript
import { enableIndexedDbPersistence } from 'firebase/firestore';

// 在初始化後啟用
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
        console.warn('Browser does not support persistence');
    }
});
```

### 監控連線狀態

應用已實現連線狀態監控，會顯示以下狀態：
- **連線中...** - 正在嘗試連線
- **已連線** - 成功連線到 Firestore
- **離線** - 網路離線
- **離線（快取）** - 使用本地緩存
- **連線錯誤** - 連線失敗
- **測試模式** - 使用測試模式

---

## 📧 需要幫助？

如果以上步驟都無法解決問題，請提供以下信息：

1. 瀏覽器控制台的完整錯誤訊息
2. Firebase Console 中的 Firestore 規則截圖
3. 網路請求失敗的詳細信息（使用瀏覽器開發工具 Network 標籤）
4. 診斷腳本的完整輸出

聯繫方式: showchen@aivres.com
