defmodule Codebattle.Bot.Builder do
  @moduledoc """
    generate bots for different environments
  """

  alias Codebattle.User

  def build do
    %User{id: 0, name: "superPlayer", raiting: 1137}
  end
end
