# Hews Line App

このディレクトリーは、LINE Appの仕組みを調査するためのサンプルアプリケーションです。

## Local開発環境のセットアップ

### 前提条件
- Docker Desktop
- Node.js (v18以上推奨)
- Cloudflare Tunnel (外部からのアクセス確認用)

### バックエンド (Rails)
1. 環境設定ファイルの作成
   ```bash
   cd backend
   cp .env.sample .env
   ```
   `.env` ファイルを開き、必要な環境変数を設定してください。
   特に `ALLOWED_HOST` は、Cloudflare Tunnelなどを使用する場合に設定が必要です（例: `api.kinami.net`）。

2. Dockerコンテナのビルドと起動
   ```bash
   cd .. # プロジェクトルートに戻る
   docker compose up -d
   ```

3. データベースのセットアップ
   ```bash
   docker compose exec backend bin/rails db:prepare
   ```

### フロントエンド (Next.js)
1. 環境設定ファイルの作成
   ```bash
   cd frontend
   cp .env.sample .env
   ```
   `.env` ファイルに必要な値を設定してください。

2. 依存パッケージのインストール
   ```bash
   npm install
   ```

## Local開発環境の起動方法

1. バックエンドの起動
   ```bash
   docker compose up -d
   ```
   APIサーバーは `http://localhost:3001` で起動します。

2. フロントエンドの起動
   別ターミナルで実行してください。
   ```bash
   cd frontend
   npm run dev
   ```
   フロントエンドは `http://localhost:3000` で起動します。

3. Cloudflare Tunnelの起動（実機確認など）
   スマートフォンなどからアクセスする場合は、Cloudflare Tunnelを使用します。
   ```bash
   cloudflared tunnel run --token [YOUR_TOKEN]
   ```
   ※ `.env` の `ALLOWED_HOST` にトンネルのドメインを設定するのを忘れないでください。
