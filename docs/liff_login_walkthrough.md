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
