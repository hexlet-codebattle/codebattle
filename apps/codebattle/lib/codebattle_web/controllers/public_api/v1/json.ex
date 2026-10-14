defmodule CodebattleWeb.PublicApi.V1.JSON do
  @moduledoc """
  Explicit serializers of the public API. Never encode schemas directly: only the fields
  listed here leave the server (no emails, codes, check results, access tokens of others).
  """

  alias Codebattle.Game
  alias Codebattle.Tournament.Helpers

  @base_url Application.compile_env(:codebattle, :public_api_base_url, "https://codebattle.hexlet.io")

  def me(user), do: player(user)

  @doc "The common card of a person (Player in the spec); other user objects extend it."
  def player(user) do
    %{
      id: user.id,
      name: user.name,
      avatar_url: Map.get(user, :avatar_url),
      rating: Map.get(user, :rating),
      rank: rank(Map.get(user, :rank)),
      lang: Map.get(user, :lang)
    }
  end

  # Game players carry rank -1 when it's unknown.
  defp rank(rank) when is_integer(rank) and rank > 0, do: rank
  defp rank(_rank), do: nil

  def game(game, viewer_id) do
    %{
      id: game.id,
      url: url("/games/#{game.id}"),
      state: game.state,
      level: game.level,
      type: game.type,
      starts_at: time(game.starts_at),
      timeout_seconds: game.timeout_seconds,
      ends_at: ends_at(game.starts_at, game.timeout_seconds),
      finishes_at: time(Map.get(game, :finishes_at)),
      tournament_id: game.tournament_id,
      task: game_task(game, viewer_id),
      players: Enum.map(game.players || [], &game_player(&1, game, viewer_id))
    }
  end

  defp game_player(player, game, viewer_id) do
    base =
      player
      |> player()
      |> Map.merge(%{lang: player.editor_lang, is_bot: player.is_bot, result: result(player.result)})

    # opponent's progress stays hidden while the game is live
    if game.state == "playing" and player.id != viewer_id do
      base
    else
      Map.put(base, :result_percent, player.result_percent)
    end
  end

  # "undefined" is the internal "no result yet"
  defp result("undefined"), do: nil
  defp result(result), do: result

  # A game waiting for an opponent keeps its task secret from those who may still join it.
  defp game_task(%{task: %{id: _} = task} = game, viewer_id) do
    if game.state != "waiting_opponent" or Game.Helpers.player?(game, viewer_id), do: task(task)
  end

  defp game_task(_game, _viewer_id), do: nil

  def task(task) do
    %{
      id: task.id,
      name: task.name,
      level: task.level,
      tags: Map.get(task, :tags) || [],
      visibility: Map.get(task, :visibility),
      url: url("/tasks/#{task.id}")
    }
  end

  def tournament(tournament, viewer) do
    card = %{
      id: tournament.id,
      name: tournament.name,
      url: url("/tournaments/#{tournament.id}"),
      type: tournament.type,
      state: tournament.state,
      level: tournament.level,
      grade: tournament.grade,
      access_type: tournament.access_type,
      starts_at: time(tournament.starts_at),
      started_at: time(tournament.started_at),
      players_count: tournament.players_count,
      players_limit: tournament.players_limit,
      rounds_limit: tournament.rounds_limit,
      current_round: current_round(tournament),
      break: break(tournament)
    }

    if viewer && Helpers.can_moderate?(tournament, viewer) && tournament.access_token do
      Map.merge(card, %{
        access_token: tournament.access_token,
        invite_url: url("/tournaments/#{tournament.id}?access_token=#{tournament.access_token}")
      })
    else
      card
    end
  end

  defp current_round(%{state: "active"} = tournament) do
    started_at = tournament.last_round_started_at

    ends_at =
      if tournament.break_state != "on" and started_at do
        ends_at(started_at, Helpers.current_round_timeout_seconds(tournament))
      end

    %{position: tournament.current_round_position, started_at: time(started_at), ends_at: ends_at}
  end

  defp current_round(_tournament), do: nil

  defp break(%{state: "active", break_state: "on"} = tournament) do
    %{active: true, ends_at: ends_at(tournament.last_round_ended_at, tournament.break_duration_seconds)}
  end

  defp break(_tournament), do: %{active: false, ends_at: nil}

  def invite(invite, viewer_id) do
    %{
      id: invite.id,
      state: invite.state,
      direction: if(invite.recipient_id == viewer_id, do: "incoming", else: "outgoing"),
      level: invite.game_params && invite.game_params.level,
      timeout_seconds: invite.game_params && invite.game_params.timeout_seconds,
      creator: user_card(invite.creator),
      recipient: user_card(invite.recipient),
      task_id: invite.task_id,
      game_id: invite.game_id,
      game_url: invite.game_id && url("/games/#{invite.game_id}"),
      created_at: time(invite.inserted_at)
    }
  end

  def online_user(user, state, link) do
    user
    |> player()
    |> Map.merge(%{state: state, url: link && url(link)})
  end

  defp user_card(%{id: _} = user), do: player(user)
  defp user_card(_user), do: nil

  def ranking_entry(entry) do
    Map.take(entry, [:id, :name, :place, :score, :lang])
  end

  def time(nil), do: nil
  def time(%DateTime{} = datetime), do: datetime |> DateTime.truncate(:second) |> DateTime.to_iso8601()
  def time(%NaiveDateTime{} = naive), do: naive |> DateTime.from_naive!("Etc/UTC") |> time()

  defp ends_at(nil, _seconds), do: nil
  defp ends_at(_start, nil), do: nil
  defp ends_at(%NaiveDateTime{} = start, seconds), do: start |> DateTime.from_naive!("Etc/UTC") |> ends_at(seconds)
  defp ends_at(%DateTime{} = start, seconds), do: start |> DateTime.add(seconds, :second) |> time()

  def url(path), do: @base_url <> path

  def server_time, do: time(DateTime.utc_now())
end
