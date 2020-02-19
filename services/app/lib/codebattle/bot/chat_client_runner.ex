defmodule Codebattle.Bot.ChatClientRunner do
  @moduledoc """
  Process for playing playbooks of tasks
  """
  require Logger

  def call(params) do
    :timer.sleep(500)

    PhoenixClient.Channel.push_async(params.chat_channel, "new:message", %{
      "message" => greet_opponent(params.chat_state),
      "user" => "test_bot"
    })

    :timer.sleep(2 * 60 * 1000)

    unless :rand.uniform(16) > 8 do
      PhoenixClient.Channel.push_async(params.chat_channel, "new:message", %{
        "message" => say_announcement(params.chat_state),
        "user" => "test_bot"
      })
    end

    :timer.sleep(10 * 60 * 1000)

    unless :rand.uniform(20) > 5 do
      PhoenixClient.Channel.push_async(params.chat_channel, "new:message", %{
        "message" => say_about_code(params.chat_state),
        "user" => "test_bot"
      })
    end
  end

  def say_some_excuse(chat_channel) do
    PhoenixClient.Channel.push_async(chat_channel, "new:message", %{
      "message" => some_excuse(),
      "user" => "test_bot"
    })
  end

  defp some_excuse() do
    [
      "You lucky. I don't have a clue, how solve it",
      "Perhaps, you can solve this better than i can",
      "Dame it!!!! It's hard task...",
      "It's X0xl0ma, Argh!!! I knew she would do something",
      "Vtm, Master, Guide Me"
    ]
    |> Enum.random()
  end

  defp greet_opponent(chat_state) do
    opponent = get_opponent(chat_state)
    "Hi, #{opponent["name"]}!"
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
    %{"name" => "dude", "lang" => "php"}
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
