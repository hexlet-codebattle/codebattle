defmodule Codebattle.Bot.ChatClient do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  require Logger

  def send(chat_channel, :greet_opponent) do
    send_text(chat_channel, greet_opponent_text())
  end

  def send(chat_channel, :congratulate_opponent, %{game_mode: game_mode}) do
    send_text(chat_channel, congratulate_opponent_text(game_mode))
  end

  def send(chat_channel, :advice_on_give_up) do
    send_text(chat_channel, advice_on_give_up_text())
  end

  def send(chat_channel, :excuse) do
    send_text(chat_channel, some_excuse_text())
  end

  defp some_excuse_text() do
    [
      "You lucky. I don't have a clue, how solve it",
      "Perhaps, you can solve this better than i can",
      "Dame it!!!! It's hard task...",
      "It's X0xl0ma, Argh!!! I knew she would do something",
      "Irkin, fix me",
      "Vtm, Master, Guide Me",
      "Huge Lebowski, where are you man?!",
      "Lera-Valera Help!!!111",
      "RedBrother, HELP me, please!!!!",
      "I seem to remember how to solve this task in Clojure..."
    ]
    |> Enum.random()
  end

  defp congratulate_opponent_text("training") do
    "Congratulations! You win training game. Now you can register and fight for a place in the ranking."
  end

  defp congratulate_opponent_text(_) do
    [
      "GG WP",
      "Vtm, you are a bad teacher.",
      "I'll be back next time!",
      "I lost the battle, but I will win the war!"
    ]
    |> Enum.random()
  end

  defp advice_on_give_up_text() do
    [
      "Did the task seems complicated? Here, at hexlet.io we will teach you how to solve such tasks!",
      "Hey, there! Learn JS and be happy!",
      "Maybe you should pick Ruby for this task?",
      "You now that PHP has levenshtein distance calculation function?"
    ]
    |> Enum.random()
  end

  defp greet_opponent_text() do
    [
      "Hey, I'll join when you start writing code",
      "Hello! I will wait... Until you start coding.",
      "I won't start writing code. Only after you :)"
    ]
    |> Enum.random()
  end

  defp send_text(chat_channel, text) do
    PhoenixClient.Channel.push_async(chat_channel, "chat:new_msg", %{"text" => text})
  end
end
