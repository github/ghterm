require 'sinatra'
require 'sinatra_auth_github'
require 'pp'

class TerminalApp < Sinatra::Base
  enable :sessions

  set :github_options, {
                          :secret    => ENV['GITHUB_CLIENT_SECRET'],
                          :client_id => ENV['GITHUB_CLIENT_ID'],
                          :scopes    => 'user,repo' # repo is need for org auth :\
                        }

  register Sinatra::Auth::Github

  helpers do
    def repos
      github_request("repos/show/#{github_user.login}")
    end
  end

  get '/' do
    authenticate!
    "Hello There, #{github_user.name}!#{github_user.token}\n#{repos.inspect}"
  end

  get '/logout' do
    logout!
    redirect '/'
  end
end
