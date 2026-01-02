module Api
  module V1
    module Auth
      class LineController < ApplicationController
        def create
          id_token = params[:id_token]
          
          verifier = Line::IdTokenVerifier.new(id_token)
          result = verifier.call

          if result[:success]
            user = User.find_or_create_by(line_user_id: result[:line_user_id]) do |u|
              u.name = result[:name]
              u.avatar_url = result[:avatar_url]
            end
            
            # If user exists but info changed, update it (optional)
            user.update(name: result[:name], avatar_url: result[:avatar_url])

            # Session management (Cookie)
            reset_session
            session[:user_id] = user.id

            render json: { status: 'success', user: user }, status: :ok
          else
            render json: { status: 'error', message: result[:error] }, status: :unauthorized
          end
        end
      end
    end
  end
end
