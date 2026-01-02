module Line
  class IdTokenVerifier
    VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'.freeze

    def initialize(id_token)
      @id_token = id_token
    end

    def call
      response = connection.post do |req|
        req.body = URI.encode_www_form({
          id_token: @id_token,
          client_id: ENV.fetch('LINE_CHANNEL_ID')
        })
      end

      if response.success?
        body = JSON.parse(response.body)
        {
          success: true,
          line_user_id: body['sub'],
          name: body['name'],
          avatar_url: body['picture']
        }
      else
        { success: false, error: response.body }
      end
    rescue Faraday::Error => e
      Rails.logger.error("LINE API request failed: #{e.message}")
      { success: false, error: "LINE API request failed" }
    rescue JSON::ParserError => e
      Rails.logger.error("LINE API JSON parse error: #{e.message}")
      { success: false, error: "Failed to parse LINE API response" }
    end

    private

    def connection
      Faraday.new(url: VERIFY_URL) do |faraday|
        faraday.request :url_encoded
        faraday.adapter Faraday.default_adapter
        faraday.options.timeout = 5
      end
    end
  end
end
