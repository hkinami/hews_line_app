# GeminiによるGitHub PR自動レビューのセットアップ

Gemini APIを利用して、GitHub上のPull Requestに対して自動でコードレビューを行うワークフローの構築方法です。

## 1. Gemini APIキーの取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセスします。
2. 「Get API key」または「Create API key」をクリックし、新しいキーを作成します。
3. 作成されたキー（`AIza`から始まる文字列）をコピーします。

## 2. GitHub Secretsへの登録

1. GitHubリポジトリのページを開きます。
2. **Settings** > **Secrets and variables** > **Actions** に移動します。
3. 「New repository secret」をクリックします。
4. 以下の内容で登録します：
    - **Name**: `GEMINI_API_KEY`
    - **Secret**: (手順1で取得したAPIキー)

## 3. GitHub Actionsワークフローの作成

`.github/workflows/gemini-review.yml` というファイルを作成し、以下の内容を記述します。
ここでは、シンプルに利用できるコミュニティ製アクション（例: `gemini-code-review-action` 等）を利用する例を示します。
※ 実際の利用にあたっては、使用するActionの信頼性や最新のバージョンを確認してください。

```yaml
name: Gemini Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write # コメント投稿のために必要
    steps:
      - uses: actions/checkout@v4

      # 例: コミュニティ製のActionを利用する場合
      # 以下は一例です。実際には信頼できるActionを選定するか、自作スクリプトを用います。
      - name: Gemini Code Review
        uses: fake-example/gemini-review-action@v1 # ※仮の指定です、後述の自作スクリプト方式を推奨
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

### 推奨: 自作スクリプトによる制御 (安全・確実)

サードパーティのアクションにトークンを渡すのが不安な場合は、簡単なスクリプトをリポジトリに含めるのが最も安全です。

#### A. 必要なスクリプト (`.github/scripts/review.rb` 等) の用意
`.github/scripts/Gemfile` を作成し、必要なGemを定義します。

```ruby
source 'https://rubygems.org'
gem 'octokit'
```

そして、レビュースクリプトを作成します。

#### B. ワークフローでの実行
```yaml
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.3
          bundler-cache: true
          working-directory: .github/scripts
      - name: Run Review
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd .github/scripts
          bundle exec ruby review.rb
```

詳細なスクリプトの実装が必要であれば、作成いたします。

### 4. スクリプトのサンプル (`.github/scripts/review.rb`)

以下は `octokit` と標準ライブラリの `Net::HTTP` を使用したレビュースクリプトの例です。
外部Gem（`google-generativeai`等）への依存を排除し、安定して動作するようにしています。
`.github/scripts/review.rb` として保存してください。

```ruby
require 'octokit'
require 'json'
require 'net/http'
require 'uri'

# --- 設定 ---
GEMINI_API_KEY = ENV['GEMINI_API_KEY']
GITHUB_TOKEN = ENV['GITHUB_TOKEN']
REPO = ENV['GITHUB_REPOSITORY'] # "owner/repo"
EVENT_PATH = ENV['GITHUB_EVENT_PATH']
MAX_DIFF_LENGTH = 50000

if GEMINI_API_KEY.nil? || GITHUB_TOKEN.nil?
  puts "Error: GEMINI_API_KEY or GITHUB_TOKEN is not set."
  exit 1
end

# --- GitHubクライアントの初期化 ---
client = Octokit::Client.new(access_token: GITHUB_TOKEN)
event = JSON.parse(File.read(EVENT_PATH))

# Pull Requestイベント以外はスキップ
unless event['pull_request']
  puts "This is not a pull request event."
  exit 0
end

pr_number = event['pull_request']['number']

# --- Diffの取得 ---
diff = client.pull_request(REPO, pr_number, accept: 'application/vnd.github.diff')

if diff.empty?
  puts "No changes found."
  exit 0
end

# --- Gemini API呼び出し (Net::HTTP) ---
def call_gemini_api(diff)
  # URLからkeyパラメータを削除
  uri = URI("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent")
  
  # トークン数制限対策
  truncated_diff = diff.slice(0, MAX_DIFF_LENGTH)

  prompt = <<~TEXT
    あなたはシニアソフトウェアエンジニアです。
    以下のGitHub Pull Requestの差分コード（diff）をレビューしてください。
    
    ## レビューの観点
    1. バグや論理的な誤り
    2. セキュリティ上の懸念
    3. パフォーマンスの問題
    4. Ruby/Rails (またはTypeScript/Next.js) のベストプラクティスへの準拠
    5. 可読性と保守性

    ## 出力形式
    Markdown形式で出力してください。
    問題がない場合は、ポジティブなフィードバックを簡潔に返してください。
    重要な問題がある場合は、具体的な改善案やコード例を提示してください。

    ## Diff
    ```diff
    #{truncated_diff}
    ```
  TEXT

  body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1
    }
  }

  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  
  # ヘッダーにAPIキーとContent-Typeを設定
  request = Net::HTTP::Post.new(uri)
  request['Content-Type'] = 'application/json'
  request['x-goog-api-key'] = GEMINI_API_KEY
  request.body = body.to_json

  response = http.request(request)
  
  unless response.is_a?(Net::HTTPSuccess)
    puts "Gemini API Error: #{response.code} #{response.message}"
    puts response.body
    exit 1
  end

  begin
    result = JSON.parse(response.body)
  rescue JSON::ParserError => e
    puts "Failed to parse Gemini response JSON: #{e.message}"
    puts "Response body: #{response.body}"
    exit 1
  end
  
  # レスポンスの解析
  review_text = result.dig('candidates', 0, 'content', 'parts', 0, 'text')

  if review_text.nil?
    puts "Could not find review text in the Gemini response."
    puts JSON.pretty_generate(result)
    return nil
  end

  review_text
end

puts "Sending request to Gemini..."
review_body = call_gemini_api(diff)

if review_body.nil? || review_body.empty?
  puts "No feedback generated."
  exit 0
end

# --- コメントの投稿 ---
puts "Posting comment to GitHub..."
client.add_comment(REPO, pr_number, review_body)

puts "Done!"
```
