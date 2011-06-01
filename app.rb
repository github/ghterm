require 'sinatra'
require 'sinatra_auth_github'
require 'rest_client'
require 'pp'

class TerminalApp < Sinatra::Base
  enable :sessions

  set :github_options, {
    :secret    => ENV['GITHUB_CLIENT_SECRET'],
    :client_id => ENV['GITHUB_CLIENT_ID'],
    :scopes    => 'user,repo'
  }

  register Sinatra::Auth::Github

  get '/' do
    if github_user
      redirect '/term'
    else
      erb :index
    end
  end

  get '/term' do
    if github_user
      @user = github_user
      erb :term
    else
      redirect '/'
    end
  end

  get '/auth' do
    authenticate!
    redirect '/term'
  end

  post '/proxy' do
    host = 'http://api.github.dev'
    url = host + '/' + params.delete('proxy_url')
    params['access_token'] = github_user.token

    resp = RestClient.post url, params, :content_type => :json, :accept => :json

    content_type :json
    resp
  end

  get '/logout' do
    logout!
    redirect '/'
  end
end
