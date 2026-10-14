module Api
  module V1
    class HealthController < ApplicationController
      def show
        render json: { status: "ok" }
      end

      def database
        ping = Ping.find_or_create_by!(message: "ok")
        render json: { status: "ok", database: ping.reload.message }
      end
    end
  end
end
