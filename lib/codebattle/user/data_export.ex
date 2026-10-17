defmodule Codebattle.User.DataExport do
  @moduledoc """
  Everything stored about a user, as one JSON-ready map: the answer to access /
  portability requests (GDPR, CCPA, LGPD, 152-FZ and the like), which users send
  through the feedback form (see /privacy). An admin builds the file in the console:

      user |> Codebattle.User.DataExport.build() |> Jason.encode!(pretty: true)

  Records are dumped field by field from their schemas, minus credentials
  (password and token hashes, live tokens), so new columns show up without
  touching this module.
  """

  import Ecto.Query

  alias Codebattle.ApiAuditEvent
  alias Codebattle.CodeCheck.Run
  alias Codebattle.ExternalPlatformInvite
  alias Codebattle.Feedback
  alias Codebattle.Game.BotDetection.PlayerReport
  alias Codebattle.Game.EditorEventBatch
  alias Codebattle.GroupTournamentPlayer
  alias Codebattle.PremiumRequest
  alias Codebattle.Repo
  alias Codebattle.SeasonResult
  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.User
  alias Codebattle.UserAchievement
  alias Codebattle.UserApiToken
  alias Codebattle.UserEvent
  alias Codebattle.UserGame
  alias Codebattle.UserGroupTournament
  alias Codebattle.UserSession

  @secret_fields [:password_hash, :auth_token, :token_hash, :token]

  @sections [
    sessions: UserSession,
    api_tokens: UserApiToken,
    api_audit_events: ApiAuditEvent,
    games: UserGame,
    achievements: UserAchievement,
    season_results: SeasonResult,
    tournament_results: TournamentUserResult,
    events: UserEvent,
    group_tournaments: UserGroupTournament,
    group_tournament_players: GroupTournamentPlayer,
    code_check_runs: Run,
    anti_cheat_reports: PlayerReport,
    editor_activity: EditorEventBatch,
    premium_requests: PremiumRequest,
    feedback: Feedback,
    external_platform_invites: ExternalPlatformInvite
  ]

  @spec build(User.t()) :: map()
  def build(%User{id: user_id} = user) do
    records =
      Map.new(@sections, fn {key, schema} ->
        rows =
          schema
          |> where([r], r.user_id == ^user_id)
          |> Repo.all()
          |> Enum.map(&dump/1)

        {key, rows}
      end)

    Map.merge(records, %{
      exported_at: DateTime.utc_now(:second),
      profile: dump(Repo.get!(User, user.id))
    })
  end

  defp dump(%schema{} = record) do
    fields = :fields |> schema.__schema__() |> Enum.reject(&(&1 in @secret_fields))

    record
    |> Map.take(fields)
    |> Map.new(fn {field, value} -> {field, encodable(value)} end)
  end

  # Raw binaries (binary_id is already a string) can't go through Jason.
  defp encodable(value) when is_binary(value) do
    if String.valid?(value), do: value, else: Base.encode64(value)
  end

  defp encodable(value), do: value
end
