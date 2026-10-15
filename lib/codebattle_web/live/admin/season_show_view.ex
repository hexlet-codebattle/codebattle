defmodule CodebattleWeb.Live.Admin.Season.ShowView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.Season
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Round
  alias Codebattle.Tournament.SeasonTournamentGeneratorRunner
  alias Codebattle.UserGameReport

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    season = Season.get!(id)
    tournament_count = get_tournament_count(season.id)

    {:ok,
     assign(socket,
       season: season,
       tournament_count: tournament_count,
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def handle_event("delete", _params, socket) do
    case Season.delete(socket.assigns.season) do
      {:ok, _season} ->
        {:noreply,
         socket
         |> put_flash(:info, "Season deleted successfully")
         |> push_navigate(to: Routes.admin_season_index_view_path(socket, :index))}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to delete season")}
    end
  end

  @impl true
  def handle_event("create_tournaments", _params, socket) do
    season = socket.assigns.season

    {:ok, success_count, failed_count} = SeasonTournamentGeneratorRunner.generate_season(season)
    tournament_count = get_tournament_count(season.id)

    {:noreply,
     socket
     |> assign(:tournament_count, tournament_count)
     |> put_flash(
       :info,
       "Successfully created #{success_count} tournaments (#{failed_count} failed)"
     )}
  end

  @impl true
  def handle_event("drop_tournaments", _params, socket) do
    season = socket.assigns.season
    start_datetime = DateTime.new!(season.starts_at, ~T[00:00:00], "Etc/UTC")
    end_datetime = DateTime.new!(season.ends_at, ~T[23:59:59], "Etc/UTC")

    # Get all tournament IDs for this season
    tournament_ids =
      Repo.all(
        from(t in Tournament,
          where: t.starts_at >= ^start_datetime,
          where: t.starts_at <= ^end_datetime,
          select: t.id
        )
      )

    # Delete in order to satisfy foreign key constraints:
    # 1. Delete user game reports
    Repo.delete_all(from(ugr in UserGameReport, where: ugr.tournament_id in ^tournament_ids))

    # 2. Delete games
    Repo.delete_all(from(g in Game, where: g.tournament_id in ^tournament_ids))

    # 3. Delete rounds
    Repo.delete_all(from(r in Round, where: r.tournament_id in ^tournament_ids))

    # 4. Finally delete tournaments
    deleted_count =
      from(t in Tournament,
        where: t.starts_at >= ^start_datetime,
        where: t.starts_at <= ^end_datetime
      )
      |> Repo.delete_all()
      |> elem(0)

    tournament_count = get_tournament_count(season.id)

    {:noreply,
     socket
     |> assign(:tournament_count, tournament_count)
     |> put_flash(:info, "Successfully deleted #{deleted_count} tournaments and all related data")}
  end

  defp get_tournament_count(season_id) do
    season = Season.get!(season_id)
    start_datetime = DateTime.new!(season.starts_at, ~T[00:00:00], "Etc/UTC")
    end_datetime = DateTime.new!(season.ends_at, ~T[23:59:59], "Etc/UTC")

    Tournament
    |> where([t], t.starts_at >= ^start_datetime)
    |> where([t], t.starts_at <= ^end_datetime)
    |> Repo.aggregate(:count)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4 mt-3">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="text-white">
          <i class="bi bi-calendar-range"></i> Season Details
        </h1>
        <a
          href={Routes.admin_season_index_view_path(@socket, :index)}
          class="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
        >
          <i class="bi bi-arrow-left"></i> Back to List
        </a>
      </div>

      <div class="card cb-card shadow-sm mb-4 border cb-border-color">
        <div class="card-header cb-bg-highlight-panel cb-border-color text-white">
          <div class="d-flex justify-content-between align-items-center">
            <span><i class="bi bi-info-circle"></i> Season Information</span>
            <a
              href={Routes.admin_season_edit_view_path(@socket, :edit, @season.id)}
              class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
            >
              <i class="bi bi-pencil"></i> Edit
            </a>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label cb-text">ID</label>
              <div class="fw-bold text-white">{@season.id}</div>
            </div>

            <div class="col-md-6 mb-3">
              <label class="form-label cb-text">Name</label>
              <div class="fw-bold text-white">{@season.name}</div>
            </div>

            <div class="col-md-6 mb-3">
              <label class="form-label cb-text">Year</label>
              <div class="fw-bold text-white">{@season.year}</div>
            </div>

            <div class="col-md-6 mb-3">
              <label class="form-label cb-text">Duration</label>
              <div class="fw-bold text-white">
                {Date.diff(@season.ends_at, @season.starts_at)} days
              </div>
            </div>

            <div class="col-md-6 mb-3">
              <label class="form-label cb-text">Start Date</label>
              <div class="fw-bold text-white">
                {Calendar.strftime(@season.starts_at, "%B %d, %Y")}
              </div>
            </div>

            <div class="col-md-6 mb-3">
              <label class="form-label cb-text">End Date</label>
              <div class="fw-bold text-white">
                {Calendar.strftime(@season.ends_at, "%B %d, %Y")}
              </div>
            </div>

            <div class="col-12 mb-3">
              <label class="form-label cb-text">Status</label>
              <div>
                <%= cond do %>
                  <% Date.compare(@season.starts_at, Date.utc_today()) == :gt -> %>
                    <span class="badge bg-info">
                      <i class="bi bi-clock"></i> Upcoming
                    </span>
                  <% Date.compare(@season.ends_at, Date.utc_today()) == :lt -> %>
                    <span class="badge bg-secondary">
                      <i class="bi bi-check-circle"></i> Completed
                    </span>
                  <% true -> %>
                    <span class="badge bg-success">
                      <i class="bi bi-play-circle"></i> Active
                    </span>
                <% end %>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card cb-card shadow-sm mb-4 border cb-border-color">
        <div class="card-header cb-bg-highlight-panel cb-border-color text-white">
          <i class="bi bi-trophy"></i> Tournament Management
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label cb-text">Tournament Count</label>
            <div class="fw-bold fs-4 text-white">{@tournament_count} tournaments</div>
          </div>

          <p class="cb-text mb-3">
            Generate all tournaments for this season based on the tournament schedule, or clean up existing tournaments.
          </p>

          <div class="d-flex gap-2">
            <button
              class="btn btn-secondary cb-btn-secondary cb-rounded"
              phx-click="create_tournaments"
              data-confirm="This will create all tournaments for this season. Continue?"
            >
              <i class="bi bi-plus-circle"></i> Create Season Tournaments
            </button>

            <button
              class="btn btn-warning"
              phx-click="drop_tournaments"
              data-confirm="This will delete ALL tournaments within this season's date range. Are you sure?"
              disabled={@tournament_count == 0}
            >
              <i class="bi bi-trash"></i> Drop Season Tournaments
            </button>
          </div>

          <div class="mt-3">
            <small class="cb-text">
              <i class="bi bi-info-circle"></i>
              Expected tournament types: Grand Slam (1), Masters (2), Elite (~3), Pro (~6), Challenger (daily), Rookie (every 3 hours)
            </small>
          </div>
        </div>
      </div>

      <div class="card cb-card shadow-sm border-danger">
        <div class="card-header cb-bg-highlight-panel text-white border-danger">
          <i class="bi bi-exclamation-triangle"></i> Danger Zone
        </div>
        <div class="card-body">
          <p class="cb-text mb-3">
            Once you delete a season, there is no going back. Please be certain.
          </p>
          <button
            class="btn btn-danger"
            phx-click="delete"
            data-confirm="Are you sure you want to delete this season? This action cannot be undone."
          >
            <i class="bi bi-trash"></i> Delete Season
          </button>
        </div>
      </div>
    </div>
    """
  end
end
