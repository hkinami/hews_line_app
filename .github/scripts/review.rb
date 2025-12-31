require 'octokit'
require 'json'
require 'net/http'
require 'uri'

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
  uri = URI("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=#{GEMINI_API_KEY}")
  
  # トークン数制限対策 (簡易的)
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
  
  request = Net::HTTP::Post.new(uri)
  request['Content-Type'] = 'application/json'
  request.body = body.to_json

  response = http.request(request)
  
  unless response.is_a?(Net::HTTPSuccess)
    puts "Gemini API Error: #{response.code} #{response.message}"
    puts response.body
    exit 1
  end

  result = JSON.parse(response.body)
  
  # レスポンスの解析
  begin
    result.dig('candidates', 0, 'content', 'parts', 0, 'text')
  rescue => e
    puts "Failed to parse Gemini response: #{e.message}"
    puts JSON.pretty_generate(result)
    exit 1
  end
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
