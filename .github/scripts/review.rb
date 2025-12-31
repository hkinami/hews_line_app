require 'octokit'
require 'google_generativeai'
require 'json'

# --- 設定 ---
GEMINI_API_KEY = ENV['GEMINI_API_KEY']
GITHUB_TOKEN = ENV['GITHUB_TOKEN']
REPO = ENV['GITHUB_REPOSITORY'] # "owner/repo"
EVENT_PATH = ENV['GITHUB_EVENT_PATH']

if GEMINI_API_KEY.nil? || GITHUB_TOKEN.nil?
  puts "Error: GEMINI_API_KEY or GITHUB_TOKEN is not set."
  exit 1
end

# --- GitHubクライアントの初期化 ---
client = Octokit::Client.new(access_token: GITHUB_TOKEN)
event = JSON.parse(File.read(EVENT_PATH))

# Pull Requestイベント以外はスキップ（workflowのtriggerで制御している場合は不要だが念の為）
unless event['pull_request']
  puts "This is not a pull request event."
  exit 0
end

pr_number = event['pull_request']['number']

# --- Diffの取得 ---
# Accept headerでdiff形式を指定して取得
diff = client.pull_request(REPO, pr_number, accept: 'application/vnd.github.diff')

if diff.empty?
  puts "No changes found."
  exit 0
end

# --- Gemini APIの初期化 ---
GoogleGenerativeAI.configure do |config|
  config.api_key = GEMINI_API_KEY
end

# モデルの選択 (Gemini 1.5 Proなどを推奨)
model = GoogleGenerativeAI::GenerativeModel.new(
  model_name: 'gemini-1.5-pro-latest',
  generation_config: { temperature: 0.1 }
)

# --- プロンプトの作成 ---
# トークン数制限を考慮して、diffが長すぎる場合は切り詰める処理が必要な場合があります
truncated_diff = diff.slice(0, 50000) 

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

# --- レビュー生成 ---
puts "Sending request to Gemini..."
response = model.generate_content(prompt)
review_body = response.text

# --- コメントの投稿 ---
puts "Posting comment to GitHub..."
client.add_comment(REPO, pr_number, review_body)

puts "Done!"
