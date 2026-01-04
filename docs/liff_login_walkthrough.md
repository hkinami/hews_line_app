# LINE Login

Hews Line Appは、LINEミニアプリの調査用アプリケーションです。

Frontendはnext.jsでforntendのディレクトリーで実装され, Backendはruby on railsを使用してbackendのディレクトリーで実装されています。

## LINE Loginの実装パターンの調査

Frontend、BackendでLINEのログインを認識する実装のパターンを調査します。

### 1. Web Login (Authorization Code Flow)
一般的なWebブラウザ（PC/SP）を利用する場合のフローです。

1.  **Frontend (Next.js)**: ユーザーをLINEの認可URLへリダイレクトします (`response_type=code`)。
2.  **LINE Platform**: ユーザーが認証・認可を行うと、FrontendのCallback URLに `code` が返されます。
3.  **Frontend (Next.js)**: 受け取った `code` をBackendに送信します。
4.  **Backend (Rails)**: 受け取った `code` を使い、LINE PlatformのToken Endpoint (`/oauth2/v2.1/token`) を叩いて `access_token` と `id_token` を取得します。
5.  **Backend (Rails)**: `id_token` を検証・デコードしてユーザー情報を取得（または `access_token` で `/v2/profile` を叩く）し、アプリ側のセッションを発行します。

### 2. LIFF Login (ID Token Flow)
LINEアプリ内のブラウザ（LIFFブラウザ）を利用する場合のフローです。LIFF SDKを利用することで、ユーザー操作なしで・スムーズにログイン情報を取得できます。

1.  **Frontend (Next.js/LIFF)**: LIFFアプリとして起動し、`liff.init()` -> `liff.getIDToken()` を呼び出して `id_token` を取得します。
2.  **Frontend (Next.js/LIFF)**: 取得した `id_token` をBackendに送信します。
3.  **Backend (Rails)**: 受け取った `id_token` をLINE PlatformのVerify Endpoint (`/oauth2/v2.1/verify`) で検証します。
4.  **Backend (Rails)**: 検証が成功すれば、ペイロードに含まれるユーザー情報を利用して、アプリ側のセッションを発行します。

### 3. Native App Login (Access Token Verify)
iOS/Androidのネイティブアプリ（LINE SDK利用）からのログインフローです。

1.  **Native App (iOS/Android)**: LINE SDKを利用してログインし、LINEアプリ経由で認証を行います。SDKが `access_token` を取得します。
2.  **Native App**: 取得した `access_token` をBackendに送信します。
3.  **Backend (Rails)**: 受け取った `access_token` をLINE PlatformのVerify Endpoint (`/v2/oauth/verify`) で検証します。
4.  **Backend (Rails)**: 検証が成功すれば、`/v2/profile` 等でユーザー情報を取得し、アプリ側のセッションを発行します。


## LIFF Login (ID Token Flow)の実装計画

### 前提
- LIFF IDは環境変数 `NEXT_PUBLIC_LIFF_ID` で管理する。
- Backendへのリクエストは `POST /api/v1/auth/line` とする。

### Frontend (Next.js)
- [ ] `@line/liff`@latest パッケージのインストール
- [ ] LIFF Context / Hook の実装
  - `liff.init({ liffId: ... })` の実装
  - エラーハンドリング（初期化失敗時など）
- [ ] Login Component / Logic
  - `liff.isLoggedIn()` チェック
  - 未ログイン時は `liff.login()` 実行（外部ブラウザ等の場合）
  - `liff.getIDToken()` でIDトークン取得
- [ ] API Integration
  - 取得したIDトークンをBodyに含めて `POST /api/v1/auth/line` をCall

### Backend (Rails)
- [ ] Route Config
  - `post 'auth/line', to: 'api/v1/auth/line#create'`
- [ ] Controller Implementation (`Api::V1::Auth::LineController`)
  - Params: `{ id_token: string }`
- [ ] ID Token Verification Service
  - `https://api.line.me/oauth2/v2.1/verify` へPOSTリクエスト
  - パラメータ: `id_token`, `client_id` (Channel ID)
  - レスポンスの `sub` (User ID), `name`, `picture` 等を取得・検証
- [ ] User Mgmt (Find or Create)
  - `users` テーブル (or `oauth_providers` テーブル) を `line_user_id` で検索
  - 存在しなければ新規作成
- [ ] Session Management
  - ログイン成功後、Railsセッション (Cookie) または APIトークンをFrontendに返却

### 参考: Session Management の比較 (Cookie vs API Token)

Railsでセッションを管理する際、主に「Cookieベース（Railsデフォルト）」と「APIトークンベース」の2つの方針があります。それぞれのメリット・デメリットは以下の通りです。

#### A. Cookieベース (Rails Session)
Railsのデフォルト機能 (`session[:user_id] = ...`) を利用し、ブラウザのCookieに暗号化されたセッションIDを保存する方法。

- **メリット:**
  - Railsの標準機能をそのまま使えるため実装コストが低い。
  - `HttpOnly` 属性を付与することでXSS対策になる。
  - CSRF対策もRailsの標準機能 (`protect_from_forgery`) と統合しやすい。
- **デメリット:**
  - フロントエンドとバックエンドが別ドメイン（またはポート）の場合、CORS設定 (`credentials: include`) やサードパーティCookie制限への配慮が必要。
  - ネイティブアプリ（iOS/Android）からの利用が少し扱いづらい場合がある（Cookie管理がブラウザほど透過的でない）。

#### B. APIトークンベース (JWTなど)
ログイン成功時にサーバーがトークンを発行し、クライアントがそれを保存（LocalStorage等）。リクエストごとにHeader (`Authorization: Bearer ...`) に付与する方法。

- **メリット:**
  - ステートレスであるため、サーバーのスケーラビリティが高い（DB参照を減らせる場合）。
  - クロスドメインやネイティブアプリからの利用が容易（CORSの影響を受けにくい）。
- **デメリット:**
  - LocalStorageに保存する場合、XSSに対して脆弱になるリスクがある。
  - トークンの無効化（ログアウト時の即時失効など）を実装する場合、DBやRedisでの管理が必要になり、ステートレスの利点が薄れる。
  - Rails標準の `session` ヘルパーが使えないため、認証ロジックの実装コストがやや増える。

#### 推奨方針
- **Web/LIFF主体の場合:** セキュリティ（XSS対策）とRailsの生産性を重視し、**Cookieベース** を基本とするのが無難です。ただし、開発環境(localhost)等でのCookie設定には注意が必要です。
- **ネイティブアプリ主体の場合:** **APIトークン** の方が取り扱いやすいケースが多いです。



# LIFF ログイン実装

LIFFログイン（IDトークンフロー）をRailsのCookieベースのセッション管理で実装しました。

## 実装内容

### [Backend]
#### [NEW] [Line::IdTokenVerifier](file:///Users/hideo/workspace/hews_line_app/backend/app/services/line/id_token_verifier.rb)
- LINEプラットフォームでIDトークンを検証するサービス。
#### [NEW] [Api::V1::Auth::LineController](file:///Users/hideo/workspace/hews_line_app/backend/app/controllers/api/v1/auth/line_controller.rb)
- `POST /api/v1/auth/line` をハンドリングするコントローラー。
- トークンを検証し、ユーザーを検索・作成し、セッションCookieを設定します。
#### [MODIFY] [routes.rb](file:///Users/hideo/workspace/hews_line_app/backend/config/routes.rb)
- `api/v1/auth/line` ルーティングを追加。
#### [MODIFY] [cors.rb](file:///Users/hideo/workspace/hews_line_app/backend/config/initializers/cors.rb)
- `localhost:3000` からのリクエストを `credentials: true` で許可。
#### [NEW] [User Model](file:///Users/hideo/workspace/hews_line_app/backend/app/models/user.rb)
- `line_user_id`, `name`, `avatar_url` カラムを持つユーザーモデルを追加。

### [Frontend]
#### [NEW] [LiffProvider](file:///Users/hideo/workspace/hews_line_app/frontend/src/context/LiffProvider.tsx)
- LIFFの初期化状態を管理するContextプロバイダー。
#### [NEW] [LoginButton](file:///Users/hideo/workspace/hews_line_app/frontend/src/components/LoginButton.tsx)
- ログイン/ログアウトおよびユーザープロフィール表示用のUIコンポーネント。
#### [NEW] [api.ts](file:///Users/hideo/workspace/hews_line_app/frontend/src/lib/api.ts)
- Backend APIへのリクエストを行うヘルパー関数。
#### [MODIFY] [page.tsx](file:///Users/hideo/workspace/hews_line_app/frontend/src/app/page.tsx)
- LIFFログインデモを表示するように更新。

## 次のステップ
> [!IMPORTANT]
> **環境変数の設定が必要です**
> アプリを動作させるために以下の環境変数を設定してください:
> 
> **Backend (.env または .env.development)**: 
> `LINE_CHANNEL_ID=あなたのCHANNEL_ID`
>
> **Frontend (.env.local)**: 
> `NEXT_PUBLIC_LIFF_ID=あなたのLIFF_ID`

## 検証結果
### 手動検証
- Backend APIの実装（Controller/Serviceロジック）を確認しました。
- Frontendコンポーネントの構造を確認しました。
- **注記:** 実際のログインフローの確認には、有効なLIFF IDとChannel IDの設定が必要です。
