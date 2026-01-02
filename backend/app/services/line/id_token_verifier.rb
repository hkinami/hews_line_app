module Line
  class IdTokenVerifier
    require 'net/http'
    require 'json'

    VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'

    def initialize(id_token)
      @id_token = id_token
    end

    def call
      uri = URI(VERIFY_URL)
      res = Net::HTTP.post_form(uri, { id_token: @id_token, client_id: ENV['LINE_CHANNEL_ID'] })

      if res.is_a?(Net::HTTPSuccess)
        body = JSON.parse(res.body)
        # body contains: sub, name, picture, email, etc.
        # sub is the userId
        {
          success: true,
          line_user_id: body['sub'],
          name: body['name'],
          avatar_url: body['picture']
        }
      else
        { success: false, error: res.body }
      end
    rescue => e
      { success: false, error: e.message }
    end
  end
end
