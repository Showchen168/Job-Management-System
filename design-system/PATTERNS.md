# 功能模式 Functional Patterns

> 自動同步自「工作紀錄中心」v3.0.0 - 最後更新: 2026-01-22

本文件記錄主專案中可重用的功能模式，供其他專案參考實作。

---

## 功能模組總覽

| 模組 | 功能數量 | 說明 |
|------|----------|------|
| 身份驗證 | 4 | Firebase Auth 整合 |
| 權限管理 | 2 | 多角色權限系統 |
| 團隊管理 | 0 | 團隊協作功能 |
| AI 整合 | 0 | Gemini API 整合 |
| 通用工具 | 1 | 常用工具函數 |

---

## 1. 身份驗證 (Authentication)

### 支援功能
- Email/Password 登入
- 註冊新帳號
- 密碼重設
- 登入狀態監聽

### 使用方式
```javascript
// 登入
await signInWithEmailAndPassword(auth, email, password);

// 註冊
await createUserWithEmailAndPassword(auth, email, password);

// 登出
await signOut(auth);

// 監聽狀態
onAuthStateChanged(auth, (user) => { /* ... */ });
```

---

## 2. 權限管理 (Permission Management)

### 支援功能
- Admin 權限檢查
- Root Admin 機制

### 權限層級
| 層級 | 角色 | 權限說明 |
|------|------|----------|
| 1 | Root Admin | 最高權限，硬編碼不可移除 |
| 2 | Admin | 管理所有資料和權限 |
| 3 | Editor | 存取所有資料 |
| 4 | Leader | 存取團隊資料 |
| 5 | User | 僅存取自己資料 |

### 使用方式
```javascript
const isAdmin = checkIsAdmin(user, cloudAdmins);
const isEditor = checkIsEditor(user, cloudEditors);
const canAccessAll = isAdmin || isEditor;
```

---

## 3. 團隊管理 (Team Management)

### 支援功能


### 資料結構
```javascript
{
    id: "team-uuid",
    name: "團隊名稱",
    leaderIds: ["leader@example.com"],
    members: ["member@example.com"]
}
```

### 使用方式
```javascript
const isLeader = checkIsLeader(user, teams);
const teamMembers = getLeaderTeamMembers(user, teams);
```

---

## 4. AI 整合 (AI Integration)

### 支援功能


### 使用方式
```javascript
const result = await callGeminiAI(
    [{ text: prompt }],
    apiKey,
    'gemini-2.5-flash'
);
```

---

## 5. 通用工具 (Utilities)

### 支援功能
- 日期格式化

---

## 詳細文件

完整的程式碼範例和實作細節，請參考主專案 `index.html` 或在提示詞中指定需要的功能模組。

---

*由 sync-design-system.js 自動生成*
