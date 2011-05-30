require "rubygems"
require "bundler"
Bundler.setup

Bundler.require(:runtime)

require 'app'

use Rack::Static, :urls => ["/css", "/img", "/js"], :root => "public"

run TerminalApp

