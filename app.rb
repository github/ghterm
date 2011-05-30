require 'sinatra'
require 'sinatra_auth_github'

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

  get '/logout' do
    logout!
    redirect '/'
  end
end
