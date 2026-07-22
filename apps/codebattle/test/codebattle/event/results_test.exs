defmodule Codebattle.Event.ResultsTest do
  use Codebattle.DataCase

  alias Codebattle.Event.EventClanResult
  alias Codebattle.Event.EventResult

  test "queries paginated event standings and rebuilds personal-event results" do
    clan = insert(:clan)
    user = insert(:user, clan_id: clan.id, clan: clan.name)
    event = insert(:event)
    tournament = insert(:tournament, event_id: event.id, state: "finished")

    event = event |> Ecto.Changeset.change(personal_tournament_id: tournament.id) |> Repo.update!()

    result =
      Repo.insert!(%EventResult{
        event_id: event.id,
        user_id: user.id,
        user_name: user.name,
        clan_id: clan.id,
        score: 10,
        place: 1,
        clan_place: 1
      })

    clan_result =
      Repo.insert!(%EventClanResult{
        event_id: event.id,
        clan_id: clan.id,
        score: 10,
        place: 1,
        players_count: 1
      })

    assert Enum.map(EventResult.get_by_event_id(event.id), & &1.id) == [result.id]
    assert EventResult.get_by_user_id(event.id, user.id, 10, nil).page_number == 1
    assert EventResult.get_by_user_id_and_clan_id(event.id, user.id, clan.id, 10, nil).page_number == 1
    assert Enum.map(EventClanResult.get_by_event_id(event.id), & &1.id) == [clan_result.id]
    assert EventClanResult.get_by_clan_id(event.id, clan.id, 10, nil).page_number == 1

    assert :noop = EventResult.save_results(%{event_id: nil})

    insert(:tournament_result,
      tournament_id: tournament.id,
      user_id: user.id,
      user_name: user.name,
      clan_id: clan.id,
      score: 25,
      duration_sec: 5
    )

    assert %{num_rows: 1} = EventResult.save_results(tournament)
    assert [%{user_id: user_id, score: 25}] = EventResult.get_by_event_id(event.id)
    assert user_id == user.id

    assert %{num_rows: 1} = EventClanResult.save_results(tournament)
    assert [%{clan_id: clan_id, score: 25}] = EventClanResult.get_by_event_id(event.id)
    assert clan_id == clan.id

    assert {1, nil} = EventResult.clean_results(event.id)
    assert {1, nil} = EventClanResult.clean_results(event.id)
  end
end
