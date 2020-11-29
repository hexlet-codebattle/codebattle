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
      "RedBrother, HELP me, please!!!!"
    ]
    |> Enum.random()
  end

  defp some_congrats("training") do
    "Congratulations! You win training game. Now you can register and fight for a place in the ranking."
  end

  defp some_congrats(_) do
    [
      "GG WP",
      "Vtm, you are a bad teacher."
    ]
    |> Enum.random()
  end

  defp some_advice() do
    [
      "Did the task seems complicated? Here, at hexlet.io we will teach you how to solve such tasks!",
      "Hey, there! Learn JS and be happy!"
    ]
    |> Enum.random()
  end

  defp greet_opponent(chat_state) do
    opponent = get_opponent(chat_state)
    "Hey, #{opponent["name"]}, I'll join when you start writing code"
  end

  defp say_announcement(chat_state) do
    opponent = get_opponent(chat_state)
    "I have some great news))) You may choose #{pick_language(opponent["lang"])} for this task"
  end

  defp say_about_code(_chat_state) do
    "Your code looks very strange..."
  end

  defp get_opponent(chat_state) do
    case Enum.at(chat_state["users"], 1) do
      nil ->
        default_user()

      user ->
        user
    end
  end

  defp pick_language("golang"), do: "TypeScript"
  defp pick_language(_), do: "Golang"

  defp default_user do
    %{"name" => "there", "lang" => "php"}
  end

  # Chat state
  #   %{
  #     "messages" => [],
  #     "users" => [
  #       %{
  #         "achievements" => ["bot"],
  #         "editor_mode" => nil,
  #         "editor_theme" => nil,
  #         "github_id" => 35_539_033,
  #         "guest" => false,
  #         "id" => -7,
  #         "is_bot" => true,
  #         "lang" => "js",
  #         "name" => "VadimFront",
  #         "rating" => 1300
  #       },
  #       %{
  #         "achievements" => [],
  #         "editor_mode" => nil,
  #         "editor_theme" => nil,
  #         "github_id" => 35_539_033,
  #         "guest" => false,
  #         "id" => 2,
  #         "is_bot" => false,
  #         "lang" => "ruby",
  #         "name" => "Diman-8699",
  #         "rating" => 1202
  #       }
  #     ]
  #   }, '#PID<0.994.0>}'}}
end
