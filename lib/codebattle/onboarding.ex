defmodule Codebattle.Onboarding do
  @moduledoc """
  First-party milestones for the landing-to-practice flow. Reuses the existing
  session guest ID; stores no IP, user agent, account ID or submitted code.
  Each milestone is written once, and cohorts are based on the first landing.
  """
  import Ecto.Query

  alias Codebattle.Onboarding.Session
  alias Codebattle.Repo
  alias Codebattle.User

  @retention_days 90
  @steps [
    {:landed, "Visited landing"},
    {:setup, "Opened practice setup"},
    {:started, "Started first practice"},
    {:checked, "Ran tests"},
    {:solved, "Solved first practice"},
    {:next_practice, "Started another practice"}
  ]

  def record_landing(%{is_guest: true, id: guest_id}) do
    if User.guest_id?(guest_id) and guest_id != User.guest_id() do
      now = DateTime.utc_now()

      Repo.insert_all(
        Session,
        [%{guest_id: guest_id, landed_at: now, inserted_at: now, updated_at: now}],
        on_conflict: :nothing,
        conflict_target: [:guest_id]
      )
    end

    :ok
  end

  def record_landing(_user), do: :ok

  def record_setup(guest_id) when is_integer(guest_id) do
    Session |> where(guest_id: ^guest_id) |> record_once(:setup_at)
  end

  def record_setup(_guest_id), do: :ok

  def forget(guest_id) when is_integer(guest_id) do
    Repo.delete_all(from(s in Session, where: s.guest_id == ^guest_id))
    :ok
  end

  def forget(_guest_id), do: :ok

  def record_practice(guest_id, game, lang) when is_integer(guest_id) do
    query = from(s in Session, where: s.guest_id == ^guest_id and not is_nil(s.setup_at))
    now = DateTime.utc_now()

    {started, _} =
      query
      |> where([s], is_nil(s.practice_started_at))
      |> Repo.update_all(set: [practice_started_at: now, first_game_id: game.id, first_lang: lang, updated_at: now])

    if started == 0 do
      query
      |> where([s], s.first_game_id != ^game.id and not is_nil(s.solved_at))
      |> record_once(:next_practice_at)
    end

    :ok
  end

  def record_practice(_guest_id, _game, _lang), do: :ok

  # Called after a real runner response, including a successful check after the bot won.
  # Spectators and bots never advance a human's milestones.
  def record_check(%{mode: "training"} = game, %{is_bot: false, id: user_id}, result) do
    if Enum.any?(game.players, &(&1.id == user_id)) do
      query = from(s in Session, where: s.first_game_id == ^game.id)
      record_once(query, :first_check_at)
      if result.status == "ok", do: record_once(query, :solved_at)
    end

    :ok
  end

  def record_check(_game, _user, _result), do: :ok

  def record_sign_in(guest_id) when is_integer(guest_id) do
    Session |> where(guest_id: ^guest_id) |> record_once(:signed_in_at)
  end

  def record_sign_in(_guest_id), do: :ok

  def report(days \\ 30) when days in [7, 30, 90] do
    since = DateTime.add(DateTime.utc_now(), -days, :day)
    cohort = from(s in Session, where: s.landed_at >= ^since)

    counts =
      Repo.one(
        from s in cohort,
          select: %{
            landed: count(s.id),
            setup: count(s.setup_at),
            started: count(s.practice_started_at),
            checked: count(s.first_check_at),
            solved: count(s.solved_at),
            next_practice: count(s.next_practice_at),
            signed_in: count(s.signed_in_at)
          }
      )

    {steps, _previous} =
      Enum.map_reduce(@steps, counts.landed, fn {key, label}, previous ->
        total = Map.fetch!(counts, key)

        {%{
           key: key,
           label: label,
           total: total,
           conversion: percentage(total, counts.landed),
           from_previous: percentage(total, previous),
           not_reached: previous - total
         }, total}
      end)

    languages =
      Repo.all(
        from s in cohort,
          where: not is_nil(s.first_lang),
          group_by: s.first_lang,
          order_by: [desc: count(s.id), asc: s.first_lang],
          select: %{lang: s.first_lang, started: count(s.id), solved: count(s.solved_at)}
      )

    %{days: days, total: counts.landed, signed_in: counts.signed_in, steps: steps, languages: languages}
  end

  def purge_expired do
    cutoff = DateTime.add(DateTime.utc_now(), -@retention_days, :day)
    Repo.delete_all(from(s in Session, where: s.landed_at < ^cutoff))
  end

  defp record_once(query, milestone) do
    now = DateTime.utc_now()

    query
    |> where([s], is_nil(field(s, ^milestone)))
    |> Repo.update_all(set: [{milestone, now}, {:updated_at, now}])

    :ok
  end

  defp percentage(_total, 0), do: 0.0
  defp percentage(total, base), do: Float.round(total * 100 / base, 1)
end
