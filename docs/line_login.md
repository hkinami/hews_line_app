# LINE Login

## 設計の概要

本アプリケーションのLINEログインは、LIFF (LINE Front-end Framework) を利用したID Tokenベースの認証フローを採用しています。
フロントエンドで取得したID Tokenをバックエンドに送信し、バックエンドでLINEプラットフォームの検証APIを用いて検証を行うことで、セキュアな認証を実現しています。

### アーキテクチャ

*   **Frontend (Next.js)**: LIFF SDKを使用してLINE認証を行い、ID Tokenを取得します。取得したID TokenをバックエンドAPIに送信します。
*   **Backend (Rails API)**: 受け取ったID TokenをLINEプラットフォームの `verify` API に問い合わせて検証します。検証に成功した場合、ユーザーを特定（または新規作成）し、サーバーサイドセッション (Cookie) を発行します。

### シーケンス図

```mermaid
sequenceDiagram
    participant User
    participant Frontend (LoginButton)
    participant LiffSDK
    participant LINE_Platform
    participant Backend (LineController)

    User->>Frontend (LoginButton): "Login with LINE" クリック
    Frontend (LoginButton)->>LiffSDK: liff.login()
    
    LiffSDK->>LINE_Platform: Redirect to Auth
    LINE_Platform-->>User: LINEログイン画面/同意画面
    User->>LINE_Platform: 承認 (Credentials/Consent)
    LINE_Platform-->>LiffSDK: Redirect back / Login Success

    LiffSDK-->>Frontend (LoginButton): ログイン完了 (session active)
    
    Frontend (LoginButton)->>LiffSDK: liff.getIDToken()
    LiffSDK-->>Frontend (LoginButton): ID Token returns

    Frontend (LoginButton)->>Backend (LineController): POST /api/v1/auth/line (id_token)
    
    Backend (LineController)->>Backend (LineController): Line::IdTokenVerifier.new(id_token)
    Backend (LineController)->>LINE_Platform: POST /oauth2/v2.1/verify (id_token, client_id)
    LINE_Platform-->>Backend (LineController): Verification Result (sub, name, picture, etc.)

    alt Verification Success
        Backend (LineController)->>Backend (LineController): Find or Create User by line_user_id (sub)
        Backend (LineController)->>Backend (LineController): Update User Info (name, avatar)
        Backend (LineController)->>Backend (LineController): session[:user_id] = user.id
        Backend (LineController)-->>Frontend (LoginButton): 200 OK { status: 'success', user: ... }
        Frontend (LoginButton)->>Frontend (LoginButton): Set User State
        Frontend (LoginButton)-->>User: Show Profile / Logged In State
    else Verification Failed
        Backend (LineController)-->>Frontend (LoginButton): 401 Unauthorized
        Frontend (LoginButton)-->>User: Show Error Message
    end
```

### クラス図 (Backend)

認証処理に関わる主要なクラス構成です。

```mermaid
classDiagram
    class LineController {
        +create()
    }

    class IdTokenVerifier {
        -id_token : String
        -VERIFY_URL : String
        +call() : Hash
        -connection() : Faraday::Connection
    }

    class User {
        +id : Integer
        +line_user_id : String
        +name : String
        +avatar_url : String
        +created_at : DateTime
        +updated_at : DateTime
    }

    LineController ..> IdTokenVerifier : uses
    LineController ..> User : find_or_initialize_by
```

### 実装詳細

#### Frontend
*   `LiffProvider`: アプリケーション全体でLIFF SDKの初期化状態を管理するContext Provider。
*   `LoginButton`: ログインボタンのUIコンポーネント。`useLiff` フックを使用してLIFFの状態にアクセスし、ログインフローを制御します。
*   `api.ts`: その他のAPI呼び出し関数の定義。`authWithLine` 関数が含まれます。

#### Backend
*   `Api::V1::Auth::LineController`: 認証のエントリーポイント。
*   `Line::IdTokenVerifier`: LINEプラットフォームへの検証リクエストをカプセル化したService Object。Faradayを使用してHTTPリクエストを行います。
