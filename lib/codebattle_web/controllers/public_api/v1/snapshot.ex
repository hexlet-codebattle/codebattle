defmodule CodebattleWeb.PublicApi.V1.Snapshot do
  @moduledoc "Current state of a user, shared by REST endpoints and the event stream's `hello`."

  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Invite
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias CodebattleWeb.PublicApi.V1.JSON

  @unfinished_states ~w(upcoming waiting_participants active)

  @active_states ~w(waiting_opponent playing)

  @doc "The user's live game: being played, or created by them and waiting for an opponent."
  def active_game(user) do
    with game_id when not is_nil(game_id) <- Game.Context.get_active_game_id(user.id, @active_states),
         {:ok, %{is_live: true, state: state} = game} when state in @active_states <-
           Game.Context.fetch_game(game_id) do
      JSON.game(game, user.id)
    else
      _ -> nil
    end
  end

  def invites(user), do: user.id |> Invite.list_active_invites() |> Enum.map(&JSON.invite(&1, user.id))

  @doc "Tournaments the user created, moderates or plays in that are not over yet."
  def tournaments(user) do
    from(t in Tournament,
      where: t.state in @unfinished_states,
      where:
        t.creator_id == ^user.id or ^user.id in t.moderator_ids or
          fragment("((? #>> '{}')::jsonb) \\? ?", t.players, ^Integer.to_string(user.id)),
      order_by: [desc: t.id],
      limit: 20
    )
    |> Repo.all()
    |> Enum.map(&JSON.tournament(&1, user))
  end

  def hello(user) do
    %{
      user: JSON.me(user),
      active_game: active_game(user),
      invites: invites(user),
      tournaments: tournaments(user),
      server_time: JSON.server_time()
    }
  end
end
