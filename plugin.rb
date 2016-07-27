# name: Discourse presence
# about: Show which users are writing a reply to a topic
# version: 0.1
# authors: André Pereira
# url: https://github.com/adrapereira/discourse-presence.git

enabled_site_setting :presence_enabled

register_asset 'javascripts/discourse/initializers/presence-controller.js.es6'
register_asset 'javascripts/discourse/initializers/presence-router.js.es6'
register_asset 'javascripts/discourse/templates/connectors/composer-fields-below/presence.hbs'

register_asset 'stylesheets/presence.scss'

PLUGIN_NAME ||= "discourse-presence".freeze
STORE_NAME ||= "discourse-presence".freeze
CHANNEL_PREFIX_NAME ||= "presence-".freeze

after_initialize do

  module ::Presence
    class Engine < ::Rails::Engine
      engine_name PLUGIN_NAME
      isolate_namespace Presence
    end
  end

  class Presence::Presence
    class << self

    end
  end

  ::MessageBus.subscribe('/writing-reply') do |msg|
    sleep 2
    redis_channel = "#{CHANNEL_PREFIX_NAME}#{msg.data['channel_id']}"

    user_ids = $redis.hgetall(redis_channel).keys
    users = []
    users = User.find(user_ids).map(&:username) unless user_ids.blank?
    # TODO check 'users' has all Users with 'user_ids'

    MessageBus.publish("/presence-writing-#{msg.data['channel_id']}", { users: users })
  end

  require_dependency "application_controller"

  class Presence::PresencesController < ::ApplicationController
    requires_plugin PLUGIN_NAME

    def add
      $redis.hset(redis_channel, current_user.id, Time.zone.now)
      delete_old
      MessageBus.publish('/writing-reply', {channel_id: params[:id], user_id: current_user.id.to_s})
      render json: { subscribed: true }
    end

    def remove
      $redis.hdel(redis_channel, current_user.id)
      MessageBus.publish('/writing-reply', {channel_id: params[:id], user_id: current_user.id.to_s})
      render json: { subscribed: false }
    end

    def alive
      $redis.hset(redis_channel, current_user.id, Time.zone.now)
      value = delete_old
      hash = value[0]
      original_hash_size = value[1]

      # Publish the new hash if there were any changes
      if original_hash_size != hash.length
        MessageBus.publish('/writing-reply', {channel_id: params[:id], user_id: current_user.id.to_s})
      end

      render json: {alive: true}
    end

    def delete_old
      hash = $redis.hgetall(redis_channel)
      original_hash_size = hash.length

      # Delete entries older than 20 seconds
      hash.each do |user, time|
        if Time.zone.now - Time.parse(time) >= 20
          $redis.hdel(redis_channel, user)
          hash.delete(user)
        end
      end
      return hash, original_hash_size
    end

    private
    def redis_channel(id = nil)
      return "#{CHANNEL_PREFIX_NAME}#{id}" if id
      "#{CHANNEL_PREFIX_NAME}#{params[:id]}"
    end
  end

  Presence::Engine.routes.draw do
    get '/writing/:id/add' => 'presences#add'
    get '/writing/:id/remove' => 'presences#remove'
    get '/writing/:id/alive' => 'presences#alive'
  end

  Discourse::Application.routes.append do
    mount ::Presence::Engine, at: '/presence'
  end

end