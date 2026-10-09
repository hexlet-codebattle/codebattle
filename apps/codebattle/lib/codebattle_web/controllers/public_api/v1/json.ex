defmodule CodebattleWeb.PublicApi.V1.JSON do
  @moduledoc """
  Explicit serializers of the public API. Never encode schemas directly: only the fields
  listed here leave the server (no emails, codes, check results, access tokens of others).
  """

  alias Codebattle.Tournament.Helpers

  @base_url Application.compile_env(:codebattle, :public_api_base_url, "https://codebattle.hexlet.io")

  def me(user) do
    %{
      id: user.id,
      name: user.name,
      avatar_url: user.avatar_url,
      rating: user.rating,
      rank: user.rank,
      lang: user.lang
    }
  end

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
      task: task(game),
      players: Enum.map(game.players || [], &game_player(&1, game, viewer_id))
    }
  end

  defp game_player(player, game, viewer_id) do
    base = %{
      id: player.id,
      name: player.name,
      avatar_url: player.avatar_url,
      rating: player.rating,
      lang: player.editor_lang,
      is_bot: player.is_bot,
      result: player.result
    }

    # opponent's progress stays hidden while the game is live
    if game.state == "playing" and player.id != viewer_id do
      base
    else
      Map.put(base, :result_percent, player.result_percent)
    end
  end

  defp task(%{task: %{id: id} = task}), do: %{id: id, name: task.name, level: task.level}
  defp task(_game), do: nil

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
