defmodule CodebattleWeb.Utils do
  @moduledoc false

  def game_channel_name(nil) do
    :error
  end

  def game_channel_name(game_id) do
    "#{game_channel_name_base}#{game_id}"
  end

  def game_channel_name_base do
    "game:"
  end
end
