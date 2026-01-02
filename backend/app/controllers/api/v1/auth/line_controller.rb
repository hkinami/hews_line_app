module Api
  module V1
    module Auth
      class LineController < ApplicationController
        def create
          id_token = params[:id_token]
          
          verifier = Line::IdTokenVerifier.new(id_token)
          result = verifier.call

          if result[:success]
            user = User.find_or_initialize_by(line_user_id: result[:line_user_id])
            user.name = result[:name]
            user.avatar_url = result[:avatar_url]
            user.save!

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
