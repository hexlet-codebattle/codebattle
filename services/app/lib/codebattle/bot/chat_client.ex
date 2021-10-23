defmodule Codebattle.Bot.ChatClient do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  require Logger

  def call([:hello | rest], params) do
    PhoenixClient.Channel.push_async(params.chat_channel, "chat:new_msg", %{
      "message" => greet_opponent(params.chat_state),
      "user" => "test_bot"
    })

    {rest, 60 * 1000}
  end

  def call([:announce | rest], params) do
    unless :rand.uniform(16) > 8 do
      PhoenixClient.Channel.push_async(params.chat_channel, "chat:new_msg", %{
        "message" => say_announcement(params.chat_state),
        "user" => "test_bot"
      })
    end

    {rest, 3 * 60 * 1000}
  end

  def call([:about_code | _rest], params) do
    unless :rand.uniform(20) > 5 do
      PhoenixClient.Channel.push_async(params.chat_channel, "chat:new_msg", %{
        "message" => say_about_code(params.chat_state),
        "user" => "test_bot"
      })
    end

    :stop
  end

  def call([], _params) do
    :stop
  end

  def say_some_excuse(%{chat_channel: chat_channel}) do
    PhoenixClient.Channel.push_async(chat_channel, "chat:new_msg", %{
      "message" => some_excuse(),
      "user" => "test_bot"
    })
  end

  def say_time_is_up(%{chat_channel: chat_channel}) do
    PhoenixClient.Channel.push_async(chat_channel, "chat:new_msg", %{
      "message" => time_is_up_message(),
      "user" => "test_bot"
    })
  end

  def send_congrats(%{game_type: game_type, chat_channel: chat_channel}) do
    PhoenixClient.Channel.push_async(chat_channel, "chat:new_msg", %{
      "message" => some_congrats(game_type),
      "user" => "test_bot"
    })
  end

  def send_advice(%{chat_channel: chat_channel}) do
    PhoenixClient.Channel.push_async(chat_channel, "chat:new_msg", %{
      "message" => some_advice(),
      "user" => "test_bot"
    })
  end

  defp time_is_up_message() do
    [
      "Sorry, can't wait much longer. I'll start now.",
      "I'm done with waiting",
      "Come on, time is running out"
    ]
    |> Enum.random()
  end

  defp some_excuse() do
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

  defp some_congrats("training") do
    "Congratulations! You win training game. Now you can register and fight for a place in the ranking."
  end

  defp some_congrats(_) do
    [
      "GG WP",
      "Vtm, you are a bad teacher.",
      "I'll be back next time!",
      "I lost the battle, but I will win the war!"
    ]
    |> Enum.random()
  end

  defp some_advice() do
    [
      "Did the task seems complicated? Here, at hexlet.io we will teach you how to solve such tasks!",
      "Hey, there! Learn JS and be happy!",
      "Maybe you should pick Ruby for this task?",
      "You now that PHP has levenshtein distance calculation function?"
    ]
    |> Enum.random()
  end

  defp greet_opponent(chat_state) do
    opponent = get_opponent(chat_state)

    [
      "Hey, @#{opponent["name"]}, I'll join when you start writing code",
      "Hello, @#{opponent["name"]}! I will wait...Untill you start coding.",
      "I won't start writing code. Only after you, @#{opponent["name"]} :)"
    ]
    |> Enum.random()
  end

  defp say_announcement(_game_state) do
    [
      "I have some great news))) Soon you may choose 1C language. Stay tuned.",
      "If you don't know, we have a chrome extension. Which announces about new active games that you can join",
      "13th of every month, we have tournaments. "
    ]
    |> Enum.random()
  end

  defp say_about_code(_chat_state) do
    [
      "Your code looks very strange...",
      "What did you just type? Looks strange..."
    ]
    |> Enum.random()
  end

  defp get_opponent(chat_state) do
    case Enum.at(chat_state["users"], 1) do
      nil ->
        default_user()

      user ->
        user
    end
  end

  defp default_user do
    %{"name" => "there", "lang" => "php"}
  end
end
