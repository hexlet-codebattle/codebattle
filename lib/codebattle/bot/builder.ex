defmodule Codebattle.Bot.Builder do
  @moduledoc """
    generate bots for different environments
  """

  alias Codebattle.User

  def build do
    %User{id: 0, name: "superPlayer", rating: 1137}
  end
end
