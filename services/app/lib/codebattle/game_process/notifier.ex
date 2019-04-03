defmodule Codebattle.GameProcess.Notifier do
  require Logger

  import OneSignal.Param

  def call(type, params \\ %{}) do
    # TODO: add webmock bookish-spork
    if Mix.env() != :test do
      apply(__MODULE__, type, [params])
    end

    Logger.info("Send OneSignal #{type} with #{inspect(params)}")
  end

  # private

  def game_created(params) do
    OneSignal.new()
    |> put_heading("New game")
    |> put_message(:en, "Yo, new game with level: #{params.level}\
      was created by user: #{params.player.name}")
    |> put_message(:ru, "Yo, #{params.player.name} создал новую игру\
        с уровнем сложности: #{params.level}")
    |> put_filter(%{key: "userId", value: params.player.public_id, relation: "!=", field: "tag"})
    |> notify
  end

  # TODO: дать ссылку на конкретную игру
  def game_opponent_join(params) do
    Logger.debug("Send one signal notificatoin with params: #{inspect(params)}")
    OneSignal.new()
    |> put_heading("Game started")
    |> put_message(:en, "Yo, #{params.second_player.name} started playing your game")
    |> put_message(:ru, "Yo, #{params.second_player.name} начал играть в твою игру")
    |> put_filter(%{
      key: "userId",
      value: params.first_player.public_id,
      relation: "=",
      field: "tag"
    })
    |> notify
  end
end
