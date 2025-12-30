# Hews Line App のインフラ調査

このドキュメントでは、LINEミニアプリを構築するための開発環境と実効環境について調査します。

## 要件

- フロントエンドとバックエンドを分離して構築する
- フロントエンドは、Next.js (TypeScript)をVercelでホスティングする
- バックエンドは、Ruby on Railsをrender.comでホスティングする
- データベースは、PostgreSQLを使用して、Neonでホスティングする。そのほかのキャッシュなどは使用しない。
- 認証は、LINEの認証を利用して、バックエンドに検証を回す
- リポジトリは、フロントエンドとバックエンドを同じリポジトリで管理するモノリポジトリ構造とする
- デプロイフローは、paths内のファイルの変更に応じてフロントエンドとバックエンドのそれぞれをデプロイする
- 開発用とのため、コールドスタートのレイテンシーやパフォーマンスの劣化を許容する
- ローカル環境での開発は、Dockerを使用する
- ローカル環境とLINEの接続は、cloudflareのトンネルを用いる

## インフラ構築計画

### 1. リポジトリ・ディレクトリ構成 (Monorepo)

フロントエンドとバックエンドを明確に分離しつつ、同一リポジトリで管理します。

```
.
├── backend/                # Ruby on Rails (API Design)
│   ├── Dockerfile
│   ├── Gemfile
│   └── config/
│       └── database.yml   # Pooled Connection設定を含む
├── frontend/               # Next.js (Vercel Hosting)
│   ├── package.json
│   └── next.config.ts
├── docker-compose.yml      # ローカル開発用 (DB, BE, Tunnel)
└── README.md
```

### 2. 技術スタック詳細

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS (or as preferred)
- **Backend**: Ruby on Rails 8 (API Mode)
    - **Job Queue**: Solid Queue (DBベースのためRedis不要)
- **Database**: PostgreSQL (Neon Serverless)
    - 開発環境: Docker上のPostgreSQL
    - 本番環境: Neon (Connection Pooling利用)
- **Tunneling**: Cloudflare Tunnel (cloudflared)

### 3. ローカル開発環境のセットアップ

Docker Composeを利用して、DBとバックエンド、トンネルを一括管理します。フロントエンドは開発体験（HMRの速度など）を重視し、ホスト側で実行することを推奨しますが、Docker内での実行も可能です。

**docker-compose.yml 構成案:**
- `db`: PostgreSQL 16
- `backend`: Rails API (ポート3000)
- `tunnel`: Cloudflare Tunnel (`cloudflared`) - localhost:3000(backend) または localhost:3001(frontend) を公開

**起動コマンド:**
```bash
# 全体起動
docker-compose up

# フロントエンド起動 (別ターミナル)
cd frontend && npm run dev
```

### 4. デプロイ戦略 (CI/CD)

モノリポ特有の「変更があった部分のみデプロイ」を実現します。

#### A. Frontend (Vercel)
- **Root Directory**: `frontend`
- **Framework Preset**: Next.js
- **Ignore Build Step**: Vercelの設定で「Ignored Build Step」コマンドを使用し、`frontend` ディレクトリに変更がない場合はビルドをスキップします。
    ```bash
    git diff --quiet HEAD^ HEAD ./
    ```
- **環境変数**: `NEXT_PUBLIC_API_URL` 等を設定。

#### B. Backend (Render)
- **Build Command**: `./bin/render-build.sh` (Migration実行等を含む)
- **Start Command**: `./bin/rails server`
- **Root Directory**: `backend`
- **Watch Paths** (Monorepo設定):
    - RenderのSettings > Build & Deploy > **Root Directory** を `backend` に設定。
    - 変更検知はRenderがRoot Directory設定に基づいて自動で行うか、明示的な設定が必要な場合は `backend/**` を指定。

### 5. 認証・セキュリティ設定

- **LINE Login**: フロントエンド (LIFF) でアクセストークンを取得。
- **バックエンド検証**: 取得したアクセストークンをAuthorizationヘッダーでバックエンドに送信。バックエンドはLINE Platform APIを用いてトークンの有効性を検証(`GET https://api.line.me/oauth2/v2.1/verify`)し、ユーザー特定・セッション確立を行う。
- **CORS**: `frontend` のドメイン (Vercel製) からのアクセスのみを許可。





