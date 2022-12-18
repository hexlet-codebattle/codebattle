defmodule Codebattle.Bot.ChatClient do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  require Logger

  def send(chat_channel, :greet_opponent, _params) do
    send_text(chat_channel, greet_opponent_text())
  end

  def send(chat_channel, :congratulate_opponent, %{game_mode: game_mode}) do
    send_text(chat_channel, congratulate_opponent_text(game_mode))
  end

  def send(chat_channel, :advice_on_give_up, _params) do
    send_text(chat_channel, advice_on_give_up_text())
  end

  def send(chat_channel, :advice_on_win, _params) do
    send_text(chat_channel, advice_on_win())
  end

  def send(chat_channel, :advice_on_check_complete_success, _params) do
    send_text(chat_channel, advice_on_check_complete_success())
  end

  def send(chat_channel, :advice_on_check_complete_failure, _params) do
    send_text(chat_channel, advice_on_check_complete_failure())
  end

  def send(chat_channel, :say_about_code, _params) do
    send_text(chat_channel, say_about_code())
  end

  def send(chat_channel, :excuse, _params) do
    send_text(chat_channel, excuse_text())
  end

  def send(chat_channel, :start_code, %{total_time_min: total_time_min}) do
    send_text(chat_channel, start_code_text(total_time_min))
  end

  defp excuse_text() do
    [
      "You lucky. I don't have a clue, how solve it",
      "Perhaps, you can solve this better than I can",
      "Dame it!!!! It's hard task...",
      "It's X0xl0ma, Argh!!! I knew she would do something",
      "Irkin, fix me",
      "Vtm, Master, Guide Me",
      "Huge Lebowski, where are you man?!",
      "Lera-Valera Help!!!111",
      "RedBrother, HELP me, please!!!!",
      "I seem to remember how to solve this task in Clojure...",
      "Ruby or not to Ruby?..."
    ]
    |> Enum.random()
  end

  defp congratulate_opponent_text("training") do
    "Congratulations! You win training game. Now you can register and fight for a place in the ranking."
  end

  defp congratulate_opponent_text(_) do
    [
      "GG WP",
      "Good job!",
      "Well played!",
      "Vtm, you are a bad teacher.",
      "I'll be back next time!",
      "I will return!!111",
      "I'll get my revenge next time!"
    ]
    |> Enum.random()
  end

  defp advice_on_give_up_text() do
    [
      "Did the task seems complicated? Here, at hexlet.io we will teach you how to solve such tasks!",
      "Hey, there! Learn JS and be happy!",
      "Maybe you should pick Ruby for this task?",
      "You know that PHP has levenshtein distance calculation function?",
      "You know that Ruby has functions for calculating complex numbers?"
    ]
    |> Enum.random()
  end

  defp advice_on_win() do
    ["Nice shot!", "GG WP!", "Good job!", "Good one!", "Nice one!"]
    |> Enum.random()
  end

  defp advice_on_check_complete_success() do
    ["Nice try", "Wow", "Easy", "Ez"]
    |> Enum.random()
  end

  defp advice_on_check_complete_failure() do
    ["Oh snap", "Take it easy"]
    |> Enum.random()
  end

  defp greet_opponent_text() do
    [
      "Hey, I'll join when you start writing code",
      "Hey there! I will wait... Until you start coding.",
      "I won't start writing code. Only after you :)"
    ]
    |> Enum.random()
  end

  defp start_code_text(total_time_min) do
    "I'll solve this task in about #{total_time_min} minutes. Good luck!"
  end

  defp say_about_code() do
    [
      "Your code looks very strange...",
      "What did you just type? Looks strange...",
      "What is this?...",
      "Hmmmm...",
      "Whaaaaat?...",
      "¯\_(ツ)_/¯"
    ]
    |> Enum.random()
  end

  # TODO: add this event
  # defp time_is_up_message() do
  #   [
  #     "Sorry, can't wait much longer. I'll start now.",
  #     "I'm done with waiting",
  #     "Come on, time is running out",
  #     "Tic-toc, time is up! "
  #   ]
  #   |> Enum.random()
  # end

  defp send_text(chat_channel, text) do
    PhoenixClient.Channel.push_async(chat_channel, "chat:add_msg", %{"text" => text})
  end
end
