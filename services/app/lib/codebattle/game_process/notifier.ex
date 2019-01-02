defmodule Codebattle.GameProcess.Notifier do
  import OneSignal.Param

  def call(type, params \\ %{}) do
    # TODO: add webmock bookish-spork
    if Mix.env() != :test do
      apply(__MODULE__, type, [params])
    end
  end

  # private

  def game_created(params) do
    OneSignal.new()
    |> put_heading("New game")
    |> put_message(:en, "Yo, new game with level: #{params.level}\
      was created by user: #{params.user.name}")
    |> put_message(:ru, "Yo, #{params.user.name} создал новую игру\
        с уровнем сложности: #{params.level}")
    |> put_filter(%{key: "userId", value: params.user.public_id, relation: "!=", field: "tag"})
    |> notify
  end

  # TODO: дать ссылку на конкретную игру
  def game_opponent_join(params) do
    OneSignal.new()
    |> put_heading("Game started")
    |> put_message(:en, "Yo, #{params.creator.name} started playing your game")
    |> put_message(:ru, "Yo, #{params.creator.name} начал играть в твою игру")
    |> put_filter(%{key: "userId", value: params.creator.public_id, relation: "=", field: "tag"})
    |> notify
  end
end
