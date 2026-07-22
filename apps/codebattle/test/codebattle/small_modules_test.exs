defmodule Codebattle.SmallModulesTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Auth.User, as: AuthUser
  alias Codebattle.Auth.User.ExternalUser
  alias Codebattle.Auth.User.TokenUser
  alias Codebattle.CodeCheck.CssResult
  alias Codebattle.CodeCheck.Result.V2
  alias Codebattle.CodeCheck.SqlResult
  alias Codebattle.CssTask
  alias Codebattle.Game
  alias Codebattle.Game.EditorEventBatch
  alias Codebattle.Game.Helpers, as: GameHelpers
  alias Codebattle.Game.Player, as: GamePlayer
  alias Codebattle.PremiumRequest
  alias Codebattle.SqlTask
  alias Codebattle.TaskPack
  alias Codebattle.TaskPackForm
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Round
  alias Codebattle.Tournament.Round.Context, as: RoundContext
  alias Codebattle.UserAchievement
  alias Codebattle.UserEvent.State, as: UserEventState

  test "encodes map sets as JSON arrays" do
    assert [1, 2] |> MapSet.new() |> Jason.encode!() |> Jason.decode!() |> Enum.sort() == [1, 2]
  end

  test "creates the default version 2 check result" do
    assert %V2{
             exit_code: 0,
             success_count: 0,
             asserts_count: 1,
             status: "initial",
             output_error: "",
             version: 2,
             asserts: []
           } = V2.new()

    assert %CssResult{status: "initial"} = CssResult.new()
    assert %SqlResult{status: "initial"} = SqlResult.new()
  end

  test "builds valid empty CSS and SQL task drafts" do
    css_task = CssTask.create_empty(1)
    sql_task = SqlTask.create_empty(1)

    refute CssTask.changeset(css_task, %{}).valid?
    refute SqlTask.changeset(sql_task, %{}).valid?
  end

  test "returns real time when the test clock is not frozen" do
    original = Application.get_env(:codebattle, :freeze_time)
    Application.put_env(:codebattle, :freeze_time, false)

    on_exit(fn -> Application.put_env(:codebattle, :freeze_time, original) end)

    assert NaiveDateTime.diff(NaiveDateTime.utc_now(:second), TimeHelper.utc_now()) in 0..1
  end

  test "validates task pack ids and reports malformed input" do
    valid =
      TaskPackForm.changeset(%TaskPack{}, %{
        "name" => "practice",
        "state" => "draft",
        "visibility" => "public",
        "creator_id" => 1,
        "task_ids" => "1, 2,3"
      })

    assert valid.valid?
    assert Ecto.Changeset.get_change(valid, :task_ids) == [1, 2, 3]

    invalid = TaskPackForm.changeset(%TaskPack{}, %{"task_ids" => "1, nope"})

    assert {"Please provide only integers with comma separated values", _opts} =
             invalid.errors[:task_ids]
  end

  test "creates external users without an avatar when the provider marks it empty" do
    profile = %{
      id: "external-user-no-avatar",
      login: "external-login",
      is_avatar_empty: true,
      default_avatar_id: "unused"
    }

    assert {:ok, user} = ExternalUser.find_or_create(profile)
    assert user.avatar_url == nil
    assert user.external_oauth_id == profile.id
  end

  test "exposes tournament configuration values and validates referenced events" do
    event = insert(:event)
    creator = insert(:user)

    assert "token" in Tournament.access_types()
    assert "open" in Tournament.grades()
    assert "swiss" in Tournament.public_types()
    assert "by_user" in Tournament.ranking_types()
    assert "75_percentile" in Tournament.score_strategies()
    assert "level" in Tournament.task_providers()
    assert "random" in Tournament.task_strategies()
    assert "per_task" in Tournament.timeout_modes()
    assert "swiss" in Tournament.types()

    valid =
      Tournament.changeset(%Tournament{}, %{
        name: "Event tournament",
        description: "Valid tournament",
        starts_at: DateTime.utc_now(),
        event_id: event.id,
        creator: creator
      })

    assert valid.valid?
    assert Ecto.Changeset.get_field(valid, :event_id) == event.id
    assert Ecto.Changeset.get_field(valid, :creator).id == creator.id

    invalid =
      Tournament.changeset(%Tournament{}, %{
        name: "Missing event",
        description: "Invalid tournament",
        starts_at: DateTime.utc_now(),
        event_id: -1
      })

    assert {"Event not found", _} = invalid.errors[:event_id]

    blank = Tournament.changeset(%Tournament{}, %{event_id: ""})
    refute Keyword.has_key?(blank.errors, :event_id)
  end

  test "stores and validates premium requests" do
    user = insert(:user)

    refute PremiumRequest.changeset(%PremiumRequest{}, %{}).valid?
    assert {:ok, request} = PremiumRequest.upsert_premium_request!(user.id, "pending")
    assert request.user_id == user.id
    assert request.status == "pending"
    assert Enum.any?(PremiumRequest.all(), &(&1.id == request.id))
  end

  test "creates local auth users and resolves trimmed auth tokens" do
    assert TokenUser.find(nil) == {:error, "lol"}
    assert TokenUser.find("") == {:error, "kek"}
    assert TokenUser.find("missing") == {:error, "Wrong auth token"}

    user = insert(:user, auth_token: "secret-token")
    assert {:ok, found} = AuthUser.find_by_token("  secret-token  ")
    assert found.id == user.id

    assert {:ok, token_user} =
             AuthUser.create_token_user(%{
               name: "Token #{System.unique_integer([:positive])}",
               external_oauth_id: "external-#{System.unique_integer([:positive])}"
             })

    assert token_user.external_oauth_id

    assert {:ok, dev_user} =
             AuthUser.create_dev_user(%{
               email: "dev-#{System.unique_integer([:positive])}@example.test",
               name: "Dev user"
             })

    assert dev_user.name == "Dev user"
  end

  test "exposes game helper accessors and predicates" do
    human = GamePlayer.build(build(:user, id: 10))
    bot = GamePlayer.build(build(:user, id: 11, is_bot: true))
    now = NaiveDateTime.utc_now(:second)

    game = %Game{
      id: 12,
      inserted_at: now,
      starts_at: now,
      timeout_seconds: 30,
      type: "duo",
      mode: "training",
      visibility_type: "hidden",
      level: "easy",
      rematch_state: "none",
      rematch_initiator_id: human.id,
      players: [human, bot]
    }

    assert GameHelpers.get_starts_at(game) == now
    assert GameHelpers.get_rematch_initiator_id(game) == human.id
    assert GameHelpers.get_first_non_bot(game).id == human.id
    assert GameHelpers.training_game?(game)
  end

  test "validates tournament matches and lists their states" do
    assert "playing" in Match.states()
    assert Match.changeset(%Match{}, %{id: 1, state: "playing"}).valid?

    invalid = Match.changeset(%Match{}, %{state: "unknown"})
    assert {"is invalid", _} = invalid.errors[:state]
  end

  test "rejects editor event batches whose time window runs backwards" do
    changeset =
      EditorEventBatch.changeset(%EditorEventBatch{}, %{
        window_start_offset_ms: 20,
        window_end_offset_ms: 10
      })

    assert {"must be greater than or equal to window_start_offset_ms", _} =
             changeset.errors[:window_end_offset_ms]
  end

  test "builds per-round configuration and handles an empty bulk upsert" do
    players_table = Tournament.Players.create_table(System.unique_integer([:positive]))

    tournament = %Tournament{
      id: System.unique_integer([:positive]),
      players_table: players_table,
      break_duration_seconds: 5,
      level: "easy",
      task_provider: "task_pack",
      task_strategy: "sequential",
      type: "swiss",
      use_infinite_break: false,
      current_round_position: 1,
      meta: %{
        rounds_config_type: "per_round",
        rounds_config: [
          %{round_timeout_seconds: 10, task_pack_id: 100},
          %{round_timeout_seconds: 20, task_pack_id: 200}
        ]
      }
    }

    round = RoundContext.build(tournament)
    assert round.round_timeout_seconds == 20
    assert round.task_pack_id == 200
    assert RoundContext.update_struct(%Round{}, %{state: "finished"}).state == "finished"
    assert RoundContext.upsert_all([]) == {0, nil}
  end

  test "disables active tournament rounds and exposes round states" do
    tournament = insert(:tournament)
    active = Repo.insert!(%Round{tournament_id: tournament.id, state: "active"})
    disabled = Repo.insert!(%Round{tournament_id: tournament.id, state: "disabled"})

    assert "active" in Round.states()
    assert {1, nil} = Round.disable_all_rounds(tournament.id)
    assert Repo.get!(Round, active.id).state == "disabled"
    assert Repo.get!(Round, disabled.id).state == "disabled"
  end

  test "validates achievement uniqueness and exposes embedded user-event state" do
    user = insert(:user)
    attrs = %{user_id: user.id, type: :polyglot, meta: %{languages: 3}}

    assert :polyglot in UserAchievement.types()
    assert {:ok, _achievement} = %UserAchievement{} |> UserAchievement.changeset(attrs) |> Repo.insert()
    assert {:error, duplicate} = %UserAchievement{} |> UserAchievement.changeset(attrs) |> Repo.insert()
    assert {_, _} = duplicate.errors[:user_id]

    state_changeset = UserEventState.changeset(%UserEventState{}, %{})
    assert state_changeset.valid?
    assert Ecto.Changeset.apply_changes(state_changeset) == %UserEventState{}
  end
end
