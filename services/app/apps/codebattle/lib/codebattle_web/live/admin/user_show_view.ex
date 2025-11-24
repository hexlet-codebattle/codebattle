defmodule CodebattleWeb.Live.Admin.UserShowView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.Clan
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserEvent
  alias Codebattle.UserGame

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    user = User.get!(id, preload: [:clan])
    user_events = get_user_events(user.id)
    user_games = get_user_games(user.id)

    # Precompute a % for progress bar
    max_rating = 2000
    progress = Float.round(user.rating / max_rating * 100, 1)

    {:ok,
     assign(socket,
       user: user,
       user_events: user_events,
       user_games: user_games,
       show_modal: false,
       current_user_event: nil,
       stages_json: "",
       progress: progress,
       layout: {CodebattleWeb.LayoutView, :empty}
     )}
  end

  @impl true
  def handle_event("reset_token", %{"id" => id}, socket) do
    case User.reset_auth_token(id) do
      {:ok, user} ->
        # Recalculate progress when user changes
        max_rating = 2000
        progress = Float.round(user.rating / max_rating * 100, 1)
        {:noreply, assign(socket, user: user, progress: progress)}

      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  def handle_event("delete_token", %{"id" => id}, socket) do
    case User.delete_auth_token(id) do
      {:ok, user} ->
        # Recalculate progress when user changes
        max_rating = 2000
        progress = Float.round(user.rating / max_rating * 100, 1)
        {:noreply, assign(socket, user: user, progress: progress)}

      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  def handle_event(
        "update_subscription_type",
        %{"user" => %{"subscription_type" => subscription_type, "user_id" => user_id}},
        socket
      ) do
    case User.update_subscription_type(user_id, subscription_type) do
      {:ok, user} ->
        # Recalculate progress when user changes
        max_rating = 2000
        progress = Float.round(user.rating / max_rating * 100, 1)
        {:noreply, assign(socket, user: user, progress: progress)}

      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  def handle_event("open_edit_modal", %{"user-event-id" => user_event_id}, socket) do
    user_event = UserEvent.get!(user_event_id)
    stages_json = Jason.encode_to_iodata!(user_event.stages, pretty: true)

    {:noreply, assign(socket, show_modal: true, current_user_event: user_event, stages_json: stages_json)}
  end

  def handle_event("close_modal", _, socket) do
    {:noreply, assign(socket, show_modal: false, current_user_event: nil, stages_json: "")}
  end

  def handle_event("update_user_event_stages", %{"stages_json" => stages_json}, socket) do
    user_event = socket.assigns.current_user_event

    case Jason.decode(stages_json) do
      {:ok, stages_params} ->
        case UserEvent.upsert_stages(user_event, stages_params) do
          {:ok, _updated_user_event} ->
            # Refresh user events list
            user_events = get_user_events(socket.assigns.user.id)

            {:noreply,
             socket
             |> assign(
               user_events: user_events,
               show_modal: false,
               current_user_event: nil,
               stages_json: ""
             )
             |> put_flash(:info, "User event stages updated successfully")}

          {:error, changeset} ->
            {:noreply,
             put_flash(
               socket,
               :error,
               "Error updating user event stages: #{inspect(changeset.errors)}"
             )}
        end

      {:error, error} ->
        {:noreply, put_flash(socket, :error, "Invalid Jason format: #{inspect(error)}")}
    end
  end

  defp get_user_events(user_id) do
    UserEvent
    |> join(:inner, [ue], e in assoc(ue, :event))
    |> where([ue], ue.user_id == ^user_id)
    |> order_by([ue], desc: ue.id)
    |> limit(7)
    |> Ecto.Query.select([ue, e], %{
      id: e.id,
      inserted_at: e.inserted_at,
      event: e,
      user_event: ue
    })
    |> Repo.all()
  end

  defp get_user_games(user_id) do
    UserGame
    |> where([ug], ug.user_id == ^user_id)
    |> join(:inner, [ug], g in assoc(ug, :game))
    |> join(:inner, [ug, g], t in assoc(g, :task))
    |> order_by([ug, g], desc: g.id)
    |> limit(30)
    |> Ecto.Query.select([ug, g, t], %{
      id: g.id,
      inserted_at: g.inserted_at,
      state: g.state,
      result: ug.result,
      task_name: t.name
    })
    |> Repo.all()
  end

  def format_datetime(d, tz \\ "UTC")
  def format_datetime(nil, _time_zone), do: "none"

  def format_datetime(%NaiveDateTime{} = datetime, timezone) do
    datetime
    |> DateTime.from_naive!("UTC")
    |> format_datetime(timezone)
  end

  def format_datetime(%DateTime{} = datetime, timezone) do
    datetime
    |> DateTime.shift_zone!(timezone)
    |> Timex.format!("%Y-%m-%d %H:%M %Z", :strftime)
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container mt-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i class="bi bi-person-circle"></i>
          {@user.name || "Anonymous"}
        </h1>
        <a href={Routes.admin_user_index_view_path(@socket, :index)} class="btn btn-outline-secondary">
          <i class="bi bi-arrow-left"></i> Back
        </a>
      </div>

      <div class="card shadow-sm mb-5">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-2 text-center">
              <img src={@user.avatar_url} class="rounded-circle mb-2" alt="Avatar" />
              <div>
                <span class={"badge " <> if(@user.is_bot, do: "bg-danger", else: "bg-success")}>
                  <i class={"bi " <> if(@user.is_bot, do: "bi-robot", else: "bi-person")}></i>
                  {if @user.is_bot, do: "Bot", else: "Human"}
                </span>
              </div>
            </div>
            <div class="col-md-10">
              <ul class="list-group list-group-flush">
                <li class="list-group-item">
                  <strong>ID:</strong> {@user.id}
                  <span class="ms-3 badge bg-info">{@user.subscription_type}</span>
                </li>
                <li class="list-group-item">
                  <strong>GitHub:</strong>
                  <%= if @user.github_id do %>
                    <a href={"https://github.com/#{@user.github_name}"} target="_blank" rel="noopener">
                      {@user.github_name} <i class="bi bi-box-arrow-up-right small"></i>
                    </a>
                    <span class="text-muted small ms-2">ID: {@user.github_id}</span>
                  <% else %>
                    <span class="text-muted">–</span>
                  <% end %>
                </li>
                <li class="list-group-item">
                  <strong>Discord:</strong>
                  <%= if @user.discord_id do %>
                    {@user.discord_name}
                    <span class="text-muted small ms-2">ID: {@user.discord_id}</span>
                  <% else %>
                    <span class="text-muted">–</span>
                  <% end %>
                </li>
                <li class="list-group-item">
                  <strong>External OAuth:</strong>
                  <%= if @user.external_oauth_id do %>
                    <span>{@user.external_oauth_id}</span>
                    <%= if @user.category do %>
                      <span class="badge bg-secondary ms-2">{@user.category}</span>
                    <% end %>
                  <% else %>
                    <span class="text-muted">–</span>
                  <% end %>
                </li>
                <li class="list-group-item">
                  <strong>Email:</strong> {@user.email || "–"}
                </li>
                <li class="list-group-item">
                  <strong>Joined:</strong>
                  {Timex.format!(@user.inserted_at, "{Mfull} {D}, {YYYY}")}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Rating:</strong> {@user.rating} pts
                  </div>
                  <div class="w-50">
                    <div class="progress" style="height: .75rem;">
                      <div
                        class="progress-bar bg-primary"
                        role="progressbar"
                        style={"width: #{@progress}%"}
                        aria-valuenow={@progress}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        {@progress}%
                      </div>
                    </div>
                  </div>
                </li>
                <li class="list-group-item">
                  <strong>Category:</strong>
                  <span class="badge bg-warning text-dark">{@user.category}</span>
                </li>
                <li class="list-group-item">
                  <strong>Clan:</strong>
                  <%= if @user.clan_id do %>
                    <div>
                      <span class="badge bg-secondary">{@user.clan_id}</span>
                      <% clan = Clan.get(@user.clan_id) %>
                      <%= if clan do %>
                        <div class="mt-2 small">
                          <div><strong>ID:</strong> {clan.id}</div>
                          <%= if clan.long_name && clan.long_name != clan.name do %>
                            <div><strong>Full name:</strong> {clan.long_name}</div>
                          <% end %>
                        </div>
                      <% end %>
                    </div>
                  <% else %>
                    None
                  <% end %>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <!-- Authentication Card -->
        <div class="col-lg-6 mb-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-primary text-white">
              <i class="bi bi-shield-lock"></i> Authentication
            </div>
            <div class="card-body">
              <button class="btn btn-sm btn-primary" phx-click="reset_token" phx-value-id={@user.id}>
                Reset Auth
              </button>
              <button class="btn btn-sm btn-danger" phx-click="delete_token" phx-value-id={@user.id}>
                Delete token
              </button>
              <div class="mb-3">
                <label class="form-label">Auth Link</label>
                <input
                  type="text"
                  class="form-control"
                  value={
                    CodebattleWeb.Router.Helpers.auth_url(CodebattleWeb.Endpoint, :token,
                      t: @user.auth_token
                    )
                  }
                  readonly
                />
              </div>
              <div>
                <strong>Has Password:</strong>
                {if @user.password_hash,
                  do: "<span class=\"text-success\">Yes</span>",
                  else: "<span class=\"text-muted\">No</span>" |> raw}
              </div>
            </div>
          </div>
        </div>
        <!-- Subscription Card -->
        <div class="col-lg-6 mb-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-success text-white">
              <i class="bi bi-credit-card-2-front"></i> Subscription
            </div>
            <div class="card-body">
              <.form
                :let={f}
                for={Ecto.Changeset.change(@user)}
                phx-change="update_subscription_type"
                class="row g-2 align-items-center"
              >
                {hidden_input(f, :user_id, value: @user.id)}
                <div class="col-auto">
                  <label for="subscription_type" class="col-form-label">Type:</label>
                </div>
                <div class="col">
                  {select(f, :subscription_type, Codebattle.User.subscription_types(),
                    class: "form-select"
                  )}
                </div>
              </.form>
            </div>
          </div>
        </div>
      </div>
      <!-- Recent Events -->
      <div class="row">
        <div class="col-md-12 mb-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-purple text-white" style="background-color: #6f42c1;">
              <i class="bi bi-calendar-event"></i> Recent Events
            </div>
            <div class="card-body">
              <%= if @user_events == [] do %>
                <p class="text-muted">No events participated in yet.</p>
              <% else %>
                <%= for event <- @user_events do %>
                  <div class="mb-4">
                    <!-- Event Info as Paragraph -->
                    <div class="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 class="mb-1">{event.event.title}</h5>
                        <p class="text-muted mb-1">
                          <small>
                            <strong>ID:</strong> {event.id} |
                            <strong>Date:</strong> {Timex.format!(
                              event.inserted_at,
                              "{Mshort} {D}, {YYYY}"
                            )} | <strong>Slug:</strong> {event.event.slug}
                          </small>
                        </p>
                        <p>
                          <%= if event.user_event.stages do %>
                            <% all_completed =
                              Enum.all?(event.user_event.stages, fn s -> s.status == :completed end) %>
                            <% any_started =
                              Enum.any?(event.user_event.stages, fn s -> s.status == :started end) %>
                            <% any_failed =
                              Enum.any?(event.user_event.stages, fn s -> s.status == :failed end) %>

                            <span class={"badge " <> cond do
                              all_completed -> "bg-success"
                              any_failed -> "bg-danger"
                              any_started -> "bg-info"
                              true -> "bg-secondary"
                            end}>
                              {cond do
                                all_completed -> "Completed"
                                any_failed -> "Failed"
                                any_started -> "In Progress"
                                true -> "Pending"
                              end}
                            </span>
                          <% else %>
                            <span class="badge bg-secondary">Unknown</span>
                          <% end %>
                        </p>
                      </div>
                      <div class="d-flex gap-2">
                        <button
                          class="btn btn-sm btn-outline-info"
                          phx-click="open_edit_modal"
                          phx-value-user-event-id={event.user_event.id}
                        >
                          <i class="bi bi-gear"></i> Edit User Event
                        </button>
                        <a
                          href={Routes.event_path(@socket, :edit, event.id)}
                          class="btn btn-sm btn-outline-primary"
                        >
                          <i class="bi bi-pencil"></i> Edit Event
                        </a>
                      </div>
                    </div>
                    <!-- Event Stages Table -->
                    <div class="table-responsive">
                      <table class="table table-sm table-bordered">
                        <thead class="table-light">
                          <tr>
                            <th>Stage</th>
                            <th>Status</th>
                            <th>User Status</th>
                            <th>Link</th>
                            <th>Start/End</th>
                            <th>Stats</th>
                            <th>Places</th>
                          </tr>
                        </thead>
                        <tbody>
                          <%= if event.event.stages do %>
                            <%= for event_stage <- event.event.stages do %>
                              <% user_stage =
                                if event.user_event.stages,
                                  do:
                                    Enum.find(event.user_event.stages, fn s ->
                                      s.slug == event_stage.slug
                                    end),
                                  else: nil %>
                              <tr>
                                <td>{event_stage.slug}</td>
                                <td>
                                  <span class={"badge " <> case event_stage.status do
                                    :active -> "bg-success"
                                    :pending -> "bg-secondary"
                                    :passed -> "bg-info"
                                    _ -> "bg-secondary"
                                  end}>
                                    {event_stage.status}
                                  </span>
                                </td>
                                <td>
                                  <%= if user_stage do %>
                                    <span class={"badge " <> case user_stage.status do
                                      :completed -> "bg-success"
                                      :started -> "bg-info"
                                      :failed -> "bg-danger"
                                      _ -> "bg-secondary"
                                    end}>
                                      {user_stage.status}
                                    </span>
                                  <% else %>
                                    <span class="text-muted">–</span>
                                  <% end %>
                                </td>
                                <td>
                                  <%= if user_stage do %>
                                    <%= if user_stage.tournament_id do %>
                                      <a
                                        href={
                                          Routes.tournament_path(
                                            @socket,
                                            :show,
                                            user_stage.tournament_id
                                          )
                                        }
                                        class="btn btn-sm btn-outline-primary"
                                      >
                                        <i class="fa fa-trophy"></i>
                                      </a>
                                    <% else %>
                                      <span class="text-muted">
                                        {user_stage.entrance_result}
                                      </span>
                                    <% end %>
                                  <% else %>
                                    <span class="text-muted">–</span>
                                  <% end %>
                                </td>
                                <td>
                                  <%= if user_stage && user_stage.started_at do %>
                                    <div>{format_datetime(user_stage.started_at)}</div>
                                    <div>
                                      {if user_stage.finished_at,
                                        do: format_datetime(user_stage.finished_at)}
                                    </div>
                                  <% else %>
                                    <span class="text-muted">–</span>
                                  <% end %>
                                </td>
                                <td>
                                  <%= if user_stage do %>
                                    <div>
                                      Win/Games: {user_stage.wins_count} / {user_stage.games_count}
                                    </div>
                                    <div>Score: {user_stage.score}</div>
                                    <div>Time spent: {user_stage.time_spent_in_seconds}</div>
                                  <% else %>
                                    <span class="text-muted">–</span>
                                  <% end %>
                                </td>
                                <td>
                                  <%= if user_stage do %>
                                    <div>
                                      Place in total_rank: {user_stage.place_in_total_rank}
                                    </div>
                                    <div>
                                      Place in category_rank: {user_stage.place_in_category_rank}
                                    </div>
                                  <% else %>
                                    <span class="text-muted">–</span>
                                  <% end %>
                                </td>
                              </tr>
                            <% end %>
                          <% else %>
                            <tr>
                              <td colspan="5" class="text-center text-muted">
                                No stages defined for this event
                              </td>
                            </tr>
                          <% end %>
                        </tbody>
                      </table>
                    </div>
                    <hr class="my-3" />
                  </div>
                <% end %>
              <% end %>
            </div>
          </div>
        </div>
      </div>
      <!-- Recent Games -->
      <div class="row">
        <div class="col-md-12 mb-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-info text-white">
              <i class="bi bi-list-ul"></i> Recent Games
            </div>
            <div class="card-body p-0">
              <%= if @user_games == [] do %>
                <p class="p-3 text-muted">No games played yet.</p>
              <% else %>
                <div class="table-responsive">
                  <table class="table table-hover mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Finished</th>
                        <th>Task</th>
                        <th>Status</th>
                        <th>Result</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <%= for g <- @user_games do %>
                        <tr>
                          <td>{g.id}</td>
                          <td>{g.inserted_at}</td>
                          <td>{g.finishes_at}</td>
                          <td>{g.task_name}</td>
                          <td>
                            <span class={"badge " <> case g.state do
                              "finished" -> "bg-success"
                              "timeout"  -> "bg-warning text-dark"
                              _          -> "bg-secondary"
                            end}>
                              {String.capitalize(g.state)}
                            </span>
                          </td>
                          <td>{String.capitalize(to_string(g.result))}</td>
                          <td>
                            <.link
                              href={Routes.game_path(@socket, :show, g.id)}
                              class="btn btn-sm btn-outline-primary"
                            >
                              <i class="fa fa-eye"></i>
                            </.link>
                          </td>
                        </tr>
                      <% end %>
                    </tbody>
                  </table>
                </div>
              <% end %>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal for editing user event stages -->
    <%= if @show_modal do %>
      <div
        class="modal fade show"
        tabindex="-1"
        style="display: block; background-color: rgba(0,0,0,0.5);"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit User Event Stages</h5>
              <button
                type="button"
                class="btn btn-outline-secondary"
                data-bs-dismiss="modal"
                phx-click="close_modal"
              >
                Close
              </button>
            </div>
            <div class="modal-body">
              <form phx-submit="update_user_event_stages">
                <div class="mb-3">
                  <label for="stagesJson" class="form-label">Stages Jason</label>
                  <textarea
                    class="form-control font-monospace"
                    id="stagesJson"
                    name="stages_json"
                    rows="15"
                  ><%= @stages_json %></textarea>
                  <div class="form-text">
                    Edit the Jason representation of the stages. Make sure to keep valid Jason format.
                  </div>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" phx-click="close_modal">
                    Close
                  </button>
                  <button type="submit" class="btn btn-primary">Save changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    <% end %>
    """
  end
end
