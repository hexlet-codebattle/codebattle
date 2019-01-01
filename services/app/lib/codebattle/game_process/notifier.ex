defmodule Codebattle.GameProcess.Notifier do
  import OneSignal.Param

  def call(type, params \\ %{}) do
    #TODO: add webmock bookish-spork
    if Mix.env() != :test do
      apply(__MODULE__, type, [params])
    end
  end

  # private

  def game_created(params) do
    OneSignal.new
    |> put_heading("New game")
    |> put_message(:en, "Yo, new game with level: #{params.task.level} was created")
    |> put_message(:ru, "Yo, кто-то создал новую игру с уровнем сложности: #{params.task.level}. Покажи класс!")
    |> put_filter(%{key: "userId", value: params.user.public_id, relation: "!=", field: "tag"})
    |> notify
  end

  # TODO: дать ссылку на конкретную игру
  def game_opponent_join(params) do
    OneSignal.new
    |> put_heading("Game started")
    |> put_message(:en, "Yo, someone started playing your game.")
    |> put_message(:ru, "Yo, в твою игру кто-то начал играть. Покажи класс")
    |> put_filter(%{key: "userId", value: params.creator.public_id, relation: "=", field: "tag"})
    |> notify
  end
end
