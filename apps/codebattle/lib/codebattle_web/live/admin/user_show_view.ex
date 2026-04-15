defmodule CodebattleWeb.Live.Admin.UserShowView do
  use CodebattleWeb, :live_view

  import Ecto.Query

  alias Codebattle.Event
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserEvent
  alias Codebattle.UserGame

  @max_rating 2000

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    user = User.get!(id, preload: [:clan])
    user_events = get_user_events(user.id)
    user_games = get_user_games(user.id)

    enrolled_event_ids = MapSet.new(user_events, & &1.id)
    all_events = Event.get_all()
    available_events = Enum.reject(all_events, &MapSet.member?(enrolled_event_ids, &1.id))

    {:ok,
     assign(socket,
       user: user,
       user_events: user_events,
       user_games: user_games,
       available_events: available_events,
       show_modal: false,
       current_user_event: nil,
       user_event_form: %{},
       stages_json: "",
       progress: user_progress(user),
       event_page_enabled: FunWithFlags.enabled?(:allow_event_page, for: user),
       is_moderator: User.moderator?(user),
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def handle_event("reset_token", %{"id" => id}, socket) do
    case User.reset_auth_token(id) do
      {:ok, user} ->
        {:noreply, assign(socket, user: user, progress: user_progress(user))}

      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  def handle_event("delete_token", %{"id" => id}, socket) do
    case User.delete_auth_token(id) do
      {:ok, user} ->
        {:noreply, assign(socket, user: user, progress: user_progress(user))}

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
        {:noreply, assign(socket, user: user, progress: user_progress(user))}

      {:error, _reason} ->
        {:noreply, socket}
    end
  end

  def handle_event(
        "update_stage_status",
        %{"status" => status, "user-event-id" => user_event_id, "stage-slug" => stage_slug},
        socket
      ) do
    user_event = UserEvent.get!(user_event_id)

    stages_params =
      Enum.map(user_event.stages, fn stage ->
        if stage.slug == stage_slug do
          stage |> Map.from_struct() |> Map.put(:status, String.to_existing_atom(status))
        else
          Map.from_struct(stage)
        end
      end)

    case UserEvent.upsert_stages(user_event, stages_params) do
      {:ok, _} ->
        {:noreply,
         socket
         |> assign(user_events: get_user_events(socket.assigns.user.id))
         |> put_flash(:info, "Stage \"#{stage_slug}\" updated to #{status}")}

      {:error, changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to update stage: #{inspect(changeset.errors)}")}
    end
  end

  def handle_event("reset_stage", %{"user-event-id" => user_event_id, "stage-slug" => stage_slug}, socket) do
    user_event = UserEvent.get!(user_event_id)

    stages_params =
      Enum.map(user_event.stages, fn stage ->
        if stage.slug == stage_slug do
          %{slug: stage.slug, status: :pending}
        else
          Map.from_struct(stage)
        end
      end)

    case UserEvent.upsert_stages(user_event, stages_params) do
      {:ok, _} ->
        {:noreply,
         socket
         |> assign(user_events: get_user_events(socket.assigns.user.id))
         |> put_flash(:info, "Stage \"#{stage_slug}\" reset to pending")}

      {:error, changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to reset stage: #{inspect(changeset.errors)}")}
    end
  end

  def handle_event("add_to_event", %{"event_id" => event_id}, socket) do
    user = socket.assigns.user
    event = Event.get!(event_id)
    first_stage_slug = event.stages |> List.first() |> Map.get(:slug)

    case UserEvent.create(%{user_id: user.id, event_id: event.id, status: "pending"}) do
      {:ok, user_event} ->
        UserEvent.upsert_stages(user_event, [%{slug: first_stage_slug, status: :pending}])

        user_events = get_user_events(user.id)
        enrolled_event_ids = MapSet.new(user_events, & &1.id)
        available_events = Enum.reject(Event.get_all(), &MapSet.member?(enrolled_event_ids, &1.id))

        {:noreply,
         socket
         |> assign(user_events: user_events, available_events: available_events)
         |> put_flash(:info, "User added to event \"#{event.title}\"")}

      {:error, changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to add user to event: #{inspect(changeset.errors)}")}
    end
  end

  def handle_event("toggle_event_page", _, socket) do
    user = socket.assigns.user

    if socket.assigns.event_page_enabled do
      FunWithFlags.disable(:allow_event_page, for_actor: user)
    else
      FunWithFlags.enable(:allow_event_page, for_actor: user)
    end

    {:noreply, assign(socket, event_page_enabled: !socket.assigns.event_page_enabled)}
  end

  def handle_event("toggle_moderator", _, socket) do
    user = socket.assigns.user

    new_type = if User.moderator?(user), do: :premium, else: :moderator
    {:ok, updated_user} = User.update_subscription_type(user.id, new_type)

    {:noreply, assign(socket, user: updated_user, is_moderator: User.moderator?(updated_user))}
  end

  def handle_event("open_edit_modal", %{"user-event-id" => user_event_id}, socket) do
    user_event = UserEvent.get!(user_event_id)

    {:noreply,
     assign(socket,
       show_modal: true,
       current_user_event: user_event,
       user_event_form: user_event_form(user_event),
       stages_json: Jason.encode_to_iodata!(user_event.stages, pretty: true)
     )}
  end

  def handle_event("close_modal", _, socket) do
    {:noreply,
     assign(socket,
       show_modal: false,
       current_user_event: nil,
       user_event_form: %{},
       stages_json: ""
     )}
  end

  def handle_event(
        "update_user_event_stages",
        %{
          "status" => status,
          "current_stage_slug" => current_stage_slug,
          "started_at" => started_at,
          "finished_at" => finished_at,
          "stages_json" => stages_json
        },
        socket
      ) do
    user_event = socket.assigns.current_user_event

    case Jason.decode(stages_json) do
      {:ok, stages_params} ->
        attrs = %{
          status: status,
          current_stage_slug: blank_to_nil(current_stage_slug),
          started_at: parse_datetime(started_at),
          finished_at: parse_datetime(finished_at),
          stages: stages_params
        }

        case UserEvent.update(user_event, attrs) do
          {:ok, _updated_user_event} ->
            {:noreply,
             socket
             |> assign(
               user_events: get_user_events(socket.assigns.user.id),
               show_modal: false,
               current_user_event: nil,
               user_event_form: %{},
               stages_json: ""
             )
             |> put_flash(:info, "User event updated successfully")}

          {:error, changeset} ->
            {:noreply,
             socket
             |> assign(
               user_event_form: %{
                 status: status,
                 current_stage_slug: current_stage_slug,
                 started_at: started_at,
                 finished_at: finished_at
               },
               stages_json: stages_json
             )
             |> put_flash(:error, "Error updating user event: #{inspect(changeset.errors)}")}
        end

      {:error, error} ->
        {:noreply,
         socket
         |> assign(
           user_event_form: %{
             status: status,
             current_stage_slug: current_stage_slug,
             started_at: started_at,
             finished_at: finished_at
           },
           stages_json: stages_json
         )
         |> put_flash(:error, "Invalid JSON format: #{inspect(error)}")}
    end
  end

  defp get_user_events(user_id) do
    UserEvent
    |> where([ue], ue.user_id == ^user_id)
    |> order_by([ue], desc: ue.id)
    |> preload([:event, :stages])
    |> Repo.all()
    |> Enum.map(fn user_event ->
      %{
        id: user_event.event.id,
        inserted_at: user_event.event.inserted_at,
        event: user_event.event,
        user_event: user_event
      }
    end)
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
      finishes_at: g.finishes_at,
      state: g.state,
      result: ug.result,
      task_name: t.name
    })
    |> Repo.all()
  end

  defp user_progress(user) do
    Float.round(user.rating / @max_rating * 100, 1)
  end

  defp avatar_src(%User{avatar_url: avatar_url}) when is_binary(avatar_url) and avatar_url != "", do: avatar_url

  defp avatar_src(_user), do: CodebattleWeb.Vite.static_asset_path("images/logo.svg")

  defp display_name(%User{name: name}) when is_binary(name) and name != "", do: name
  defp display_name(_user), do: "Anonymous"

  defp clan_name(%User{clan: nil}), do: "–"
  defp clan_name(%User{clan: %{name: name}}), do: name
  defp clan_name(%User{clan: clan}) when is_binary(clan), do: clan
  defp clan_name(_user), do: "–"

  defp label_value(nil), do: "–"
  defp label_value(""), do: "–"
  defp label_value(value), do: value

  defp subscription_badge_class(:admin), do: "bg-info text-dark"
  defp subscription_badge_class(:premium), do: "bg-warning text-dark"
  defp subscription_badge_class(:banned), do: "bg-danger"
  defp subscription_badge_class(_), do: "bg-secondary"

  defp format_short_datetime(nil), do: "–"

  defp format_short_datetime(%NaiveDateTime{} = datetime) do
    datetime
    |> DateTime.from_naive!("UTC")
    |> format_short_datetime()
  end

  defp format_short_datetime(%DateTime{} = datetime) do
    Timex.format!(datetime, "%d %b %Y", :strftime)
  end

  defp normalize_auth_token(nil), do: ""
  defp normalize_auth_token(token) when is_binary(token), do: String.trim(token)

  defp build_auth_link(""), do: nil

  defp build_auth_link(auth_token) do
    CodebattleWeb.Router.Helpers.auth_url(CodebattleWeb.Endpoint, :token, t: auth_token)
  end

  defp short_auth_token_label(auth_token) do
    visible_part = String.slice(auth_token, 0, 2)
    "?t=#{visible_part}..."
  end

  defp short_auth_link_label(auth_link, auth_token) do
    token_part = short_auth_token_label(auth_token)

    case String.split(auth_link, "?t=", parts: 2) do
      [base, _token] -> "#{base}#{token_part}"
      _other -> "#{auth_link} #{token_part}"
    end
  end

  defp user_event_form(user_event) do
    %{
      status: user_event.status,
      current_stage_slug: user_event.current_stage_slug || "",
      started_at: format_input_datetime(user_event.started_at),
      finished_at: format_input_datetime(user_event.finished_at)
    }
  end

  defp stage_status_class(:completed), do: "text-success"
  defp stage_status_class(:started), do: "text-info"
  defp stage_status_class(:failed), do: "text-danger"
  defp stage_status_class(:passed), do: "text-success"
  defp stage_status_class(_), do: "text-white"

  defp format_input_datetime(nil), do: ""
  defp format_input_datetime(%DateTime{} = datetime), do: DateTime.to_iso8601(datetime)

  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value

  defp parse_datetime(""), do: nil
  defp parse_datetime(nil), do: nil

  defp parse_datetime(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, datetime, _offset} ->
        datetime

      _ ->
        case NaiveDateTime.from_iso8601(value) do
          {:ok, naive_datetime} -> DateTime.from_naive!(naive_datetime, "Etc/UTC")
          _ -> nil
        end
    end
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
    <% auth_token = normalize_auth_token(@user.auth_token) %>
    <% auth_link = build_auth_link(auth_token) %>
    <div class="container-xl mt-3">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div class="cb-text text-uppercase small mb-2">Admin User Profile</div>
          <h1 class="text-white mb-0">{display_name(@user)}</h1>
        </div>
        <a
          href={Routes.admin_user_index_view_path(@socket, :index)}
          class="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
        >
          <i class="bi bi-arrow-left"></i> Back
        </a>
      </div>

      <div class="cb-bg-panel cb-border-color border shadow-sm cb-rounded p-4 mb-4 overflow-hidden">
        <div class="row g-4 align-items-stretch">
          <div class="col-lg-4">
            <div
              class="cb-bg-highlight-panel cb-border-color border cb-rounded h-100 p-4 text-center position-relative"
              style="background-image: radial-gradient(circle at top, rgba(90, 163, 255, 0.18), transparent 58%);"
            >
              <div
                class="mx-auto mb-4 d-flex align-items-center justify-content-center cb-border-color border"
                style="width: 148px; height: 148px; border-radius: 32px; background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01)); box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);"
              >
                <img
                  src={avatar_src(@user)}
                  alt={"Avatar of #{display_name(@user)}"}
                  style="width: 108px; height: 108px; object-fit: cover; border-radius: 24px; background-color: rgba(255,255,255,0.04);"
                />
              </div>

              <div class="d-flex justify-content-center flex-wrap gap-1 mb-3">
                <span class={"badge text-uppercase " <> subscription_badge_class(@user.subscription_type)}>
                  {String.upcase(to_string(@user.subscription_type))}
                </span>
                <span class={"badge " <> if(@user.is_bot, do: "bg-danger", else: "bg-success")}>
                  <i class={"bi me-1 " <> if(@user.is_bot, do: "bi-robot", else: "bi-person")}></i>
                  {if @user.is_bot, do: "Bot", else: "Human"}
                </span>
                <%= if @user.category do %>
                  <span class="badge bg-secondary">{@user.category}</span>
                <% end %>
              </div>

              <h2 class="h3 text-white mb-1">{display_name(@user)}</h2>
              <div class="cb-text mb-4">User ID #{@user.id}</div>

              <div class="row g-2 text-start">
                <div class="col-12">
                  <div class="cb-bg-panel cb-border-color border cb-rounded p-3">
                    <div class="cb-text text-uppercase small">Rating</div>
                    <div class="text-white h4 mb-0">{@user.rating}</div>
                  </div>
                </div>
                <div class="col-12">
                  <div class="cb-bg-panel cb-border-color border cb-rounded p-3">
                    <div class="cb-text text-uppercase small mb-2">Subscription</div>
                    <.form
                      :let={f}
                      id={"user-profile-subscription-#{@user.id}"}
                      for={Ecto.Changeset.change(@user)}
                      phx-change="update_subscription_type"
                      phx-submit="update"
                      class="m-0"
                    >
                      {hidden_input(f, :user_id, value: @user.id)}
                      {select(f, :subscription_type, Codebattle.User.subscription_types(),
                        class: "custom-select cb-bg-panel cb-border-color text-white cb-rounded"
                      )}
                    </.form>
                  </div>
                </div>
                <div class="col-6">
                  <div class="cb-bg-panel cb-border-color border cb-rounded p-3 h-100">
                    <div class="cb-text text-uppercase small">Joined</div>
                    <div class="text-white">{format_short_datetime(@user.inserted_at)}</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="cb-bg-panel cb-border-color border cb-rounded p-3 h-100">
                    <div class="cb-text text-uppercase small">Locale</div>
                    <div class="text-white">{label_value(@user.locale)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-lg-8">
            <div class="cb-bg-highlight-panel cb-border-color border cb-rounded h-100 p-4">
              <div class="row g-3 mb-4">
                <div class="col-md-4">
                  <div class="cb-bg-panel cb-border-color border cb-rounded p-3 h-100">
                    <div class="cb-text text-uppercase small mb-2">Events Joined</div>
                    <div class="text-white h3 mb-0">{length(@user_events)}</div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="cb-bg-panel cb-border-color border cb-rounded p-3 h-100">
                    <div class="cb-text text-uppercase small mb-2">Recent Games</div>
                    <div class="text-white h3 mb-0">{length(@user_games)}</div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="cb-bg-panel cb-border-color border cb-rounded p-3 h-100">
                    <div class="cb-text text-uppercase small mb-2">Clan</div>
                    <div class="text-white h5 mb-0">{clan_name(@user)}</div>
                  </div>
                </div>
              </div>

              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="text-white fw-bold">Rating Progress</div>
                  <div class="cb-text">{@progress}% of 2000</div>
                </div>
                <div class="progress cb-bg-panel cb-border-color border" style="height: 10px;">
                  <div
                    class="progress-bar bg-warning"
                    role="progressbar"
                    style={"width: #{@progress}%"}
                    aria-valuenow={@progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                  </div>
                </div>
              </div>

              <div class="cb-bg-panel cb-border-color border cb-rounded p-4 mb-4">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <div class="cb-text text-uppercase small mb-2">Auth Access</div>
                    <div class="text-white fw-bold">Token and login link</div>
                  </div>
                  <div class="d-flex flex-wrap gap-2">
                    <button
                      class="btn btn-sm btn-secondary cb-btn-secondary cb-rounded"
                      phx-click="reset_token"
                      phx-value-id={@user.id}
                    >
                      Reset Auth
                    </button>
                    <button
                      :if={auth_token != ""}
                      class="btn btn-sm btn-outline-danger cb-rounded"
                      phx-click="delete_token"
                      phx-value-id={@user.id}
                    >
                      Delete Token
                    </button>
                    <button
                      :if={auth_link}
                      type="button"
                      class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                      title="Copy auth link"
                      onclick="navigator.clipboard.writeText(this.dataset.link)"
                      data-link={auth_link}
                    >
                      Copy Auth Link
                    </button>
                  </div>
                </div>

                <%= if auth_link do %>
                  <div class="cb-bg-highlight-panel cb-border-color border cb-rounded p-3">
                    <div class="cb-text text-uppercase small mb-2">Preview</div>
                    <div class="text-white text-break">
                      {short_auth_link_label(auth_link, auth_token)}
                    </div>
                  </div>
                <% else %>
                  <div class="cb-text">No auth link available.</div>
                <% end %>
              </div>

              <div class="row g-0 border cb-border-color cb-rounded overflow-hidden">
                <div class="col-md-6 border-end cb-border-color">
                  <div class="d-flex justify-content-between px-3 py-3 border-bottom cb-border-color">
                    <span class="cb-text">Email</span>
                    <span class="text-white text-end">{label_value(@user.email)}</span>
                  </div>
                  <div class="d-flex justify-content-between px-3 py-3 border-bottom cb-border-color">
                    <span class="cb-text">GitHub</span>
                    <span class="text-white text-end">
                      <%= if @user.github_id do %>
                        <a
                          href={"https://github.com/#{@user.github_name}"}
                          target="_blank"
                          rel="noopener"
                        >
                          {@user.github_name}
                        </a>
                      <% else %>
                        <span class="cb-text">–</span>
                      <% end %>
                    </span>
                  </div>
                  <div class="d-flex justify-content-between px-3 py-3 border-bottom cb-border-color">
                    <span class="cb-text">Discord</span>
                    <span class="text-white text-end">{label_value(@user.discord_name)}</span>
                  </div>
                  <div class="d-flex justify-content-between px-3 py-3">
                    <span class="cb-text">External OAuth</span>
                    <span class="text-white text-end">
                      {label_value(@user.external_oauth_login || @user.external_oauth_id)}
                    </span>
                  </div>
                </div>

                <div class="col-md-6">
                  <div class="d-flex justify-content-between px-3 py-3 border-bottom cb-border-color">
                    <span class="cb-text">Auth Token</span>
                    <span class="text-white text-end text-break">
                      {if auth_token == "", do: "–", else: short_auth_token_label(auth_token)}
                    </span>
                  </div>
                  <div class="d-flex justify-content-between px-3 py-3 border-bottom cb-border-color">
                    <span class="cb-text">Category</span>
                    <span class="text-white text-end">{label_value(@user.category)}</span>
                  </div>
                  <div class="d-flex justify-content-between px-3 py-3 border-bottom cb-border-color">
                    <span class="cb-text">Clan</span>
                    <span class="text-white text-end">{clan_name(@user)}</span>
                  </div>
                  <div class="d-flex justify-content-between px-3 py-3">
                    <span class="cb-text">Joined</span>
                    <span class="text-white text-end">
                      {Timex.format!(@user.inserted_at, "{Mfull} {D}, {YYYY}")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-12 mb-4">
          <div class="cb-bg-panel cb-border-color border shadow-sm cb-rounded p-4 h-100">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="text-white">
                <i class="bi bi-calendar-event"></i> User Events
              </div>
              <div class="d-flex align-items-center gap-2">
                <%= if @available_events != [] do %>
                  <form phx-submit="add_to_event" class="d-flex align-items-center gap-2">
                    <select
                      name="event_id"
                      class="form-select form-select-sm cb-bg-panel cb-border-color text-white"
                    >
                      <%= for event <- @available_events do %>
                        <option value={event.id}>{event.title} ({event.slug})</option>
                      <% end %>
                    </select>
                    <button type="submit" class="btn btn-sm btn-warning cb-rounded text-nowrap">
                      Add to Event
                    </button>
                  </form>
                <% end %>
                <span class="cb-text small">Event Page:</span>
                <button
                  class={"btn btn-sm cb-rounded " <> if(@event_page_enabled, do: "btn-success", else: "btn-outline-secondary cb-btn-outline-secondary")}
                  phx-click="toggle_event_page"
                >
                  {if @event_page_enabled, do: "Enabled", else: "Disabled"}
                </button>
                <span class="cb-text small">Moderator Role:</span>
                <button
                  class={"btn btn-sm cb-rounded " <> if(@is_moderator, do: "btn-success", else: "btn-outline-secondary cb-btn-outline-secondary")}
                  phx-click="toggle_moderator"
                >
                  {if @is_moderator, do: "Enabled", else: "Disabled"}
                </button>
              </div>
            </div>
            <%= if @user_events == [] do %>
              <p class="cb-text">No events participated in yet.</p>
            <% else %>
              <%= for event <- @user_events do %>
                <div class="mb-4">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 class="mb-1 text-white">{event.event.title}</h5>
                      <p class="cb-text mb-1">
                        <small>
                          <strong>ID:</strong> {event.id} |
                          <strong>Date:</strong> {Timex.format!(
                            event.inserted_at,
                            "{Mshort} {D}, {YYYY}"
                          )} | <strong>Slug:</strong> {event.event.slug}
                        </small>
                      </p>
                      <p class="mb-1">
                        <span class={"badge " <> (
                            case event.user_event.status do
                              "completed" -> "bg-success"
                              "failed" -> "bg-danger"
                              "in_progress" -> "bg-info"
                              _ -> "bg-secondary"
                            end
                          )}>
                          {event.user_event.status}
                        </span>
                      </p>
                      <p class="mb-1">
                        <strong class="text-white">Current stage:</strong>
                        <span class="text-white">{event.user_event.current_stage_slug || "–"}</span>
                      </p>
                      <p class="mb-0 text-white">
                        <strong>Started:</strong> {format_datetime(event.user_event.started_at)} |
                        <strong>Finished:</strong> {format_datetime(event.user_event.finished_at)}
                      </p>
                    </div>
                    <div class="d-flex gap-2">
                      <button
                        class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                        phx-click="open_edit_modal"
                        phx-value-user-event-id={event.user_event.id}
                      >
                        <i class="bi bi-gear"></i> Edit User Event
                      </button>
                      <a
                        href={Routes.event_path(@socket, :edit, event.id)}
                        class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                      >
                        <i class="bi bi-pencil"></i> Edit Event
                      </a>
                    </div>
                  </div>
                  <div class="table-responsive">
                    <table class="table table-sm">
                      <thead class="cb-text">
                        <tr>
                          <th class="cb-border-color border-bottom">Stage</th>
                          <th class="cb-border-color border-bottom">Event Status</th>
                          <th class="cb-border-color border-bottom">User Status</th>
                          <th class="cb-border-color border-bottom">Link</th>
                          <th class="cb-border-color border-bottom">Start/End</th>
                          <th class="cb-border-color border-bottom">Stats</th>
                          <th class="cb-border-color border-bottom">Places</th>
                        </tr>
                      </thead>
                      <tbody>
                        <%= if event.event.stages do %>
                          <%= for event_stage <- event.event.stages do %>
                            <% user_stage =
                              Enum.find(event.user_event.stages, fn s ->
                                s.slug == event_stage.slug
                              end) %>
                            <tr>
                              <td class="text-white cb-border-color">{event_stage.slug}</td>
                              <td class="cb-border-color">
                                <span class={"badge " <> (
                                    case event_stage.status do
                                      :active -> "bg-success"
                                      :pending -> "bg-secondary"
                                      :passed -> "bg-info"
                                      _ -> "bg-secondary"
                                    end
                                  )}>
                                  {event_stage.status}
                                </span>
                              </td>
                              <td class="cb-border-color">
                                <%= if user_stage do %>
                                  <div class="d-flex align-items-center gap-1">
                                    <select
                                      class={"form-select form-select-sm cb-bg-panel cb-border-color cb-rounded " <> stage_status_class(user_stage.status)}
                                      phx-change="update_stage_status"
                                      phx-value-user-event-id={event.user_event.id}
                                      phx-value-stage-slug={user_stage.slug}
                                      name="status"
                                      style="width: auto; min-width: 120px;"
                                    >
                                      <%= for status <- ~w(pending started completed failed passed)a do %>
                                        <option value={status} selected={status == user_stage.status}>
                                          {status}
                                        </option>
                                      <% end %>
                                    </select>
                                    <%= if user_stage.status != :pending do %>
                                      <button
                                        class="btn btn-sm btn-outline-warning cb-rounded text-nowrap"
                                        phx-click="reset_stage"
                                        phx-value-user-event-id={event.user_event.id}
                                        phx-value-stage-slug={user_stage.slug}
                                      >
                                        Reset
                                      </button>
                                    <% end %>
                                  </div>
                                <% else %>
                                  <span class="cb-text">–</span>
                                <% end %>
                              </td>
                              <td class="cb-border-color">
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
                                      class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded text-nowrap"
                                    >
                                      #{user_stage.tournament_id}
                                    </a>
                                  <% else %>
                                    <span class="cb-text">{user_stage.entrance_result}</span>
                                  <% end %>
                                <% else %>
                                  <span class="cb-text">–</span>
                                <% end %>
                              </td>
                              <td class="text-white cb-border-color">
                                <%= if user_stage && user_stage.started_at do %>
                                  <div>{format_datetime(user_stage.started_at)}</div>
                                  <div>
                                    {if user_stage.finished_at,
                                      do: format_datetime(user_stage.finished_at)}
                                  </div>
                                <% else %>
                                  <span class="cb-text">–</span>
                                <% end %>
                              </td>
                              <td class="text-white cb-border-color">
                                <%= if user_stage do %>
                                  <div>
                                    Win/Games: {user_stage.wins_count} / {user_stage.games_count}
                                  </div>
                                  <div>Score: {user_stage.score}</div>
                                  <div>Time spent: {user_stage.time_spent_in_seconds}</div>
                                <% else %>
                                  <span class="cb-text">–</span>
                                <% end %>
                              </td>
                              <td class="text-white cb-border-color">
                                <%= if user_stage do %>
                                  <div>Place in total_rank: {user_stage.place_in_total_rank}</div>
                                  <div>
                                    Place in category_rank: {user_stage.place_in_category_rank}
                                  </div>
                                <% else %>
                                  <span class="cb-text">–</span>
                                <% end %>
                              </td>
                            </tr>
                          <% end %>
                        <% else %>
                          <tr>
                            <td colspan="7" class="text-center cb-text cb-border-color">
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

      <div class="row">
        <div class="col-md-12 mb-4">
          <div class="cb-bg-panel cb-border-color border shadow-sm cb-rounded p-4 h-100">
            <div class="mb-3 text-white">
              <i class="bi bi-list-ul"></i> Recent Games
            </div>
            <%= if @user_games == [] do %>
              <p class="cb-text mb-0">No games played yet.</p>
            <% else %>
              <div class="table-responsive">
                <table class="table table-sm mb-0">
                  <thead class="cb-text">
                    <tr>
                      <th class="cb-border-color border-bottom">#</th>
                      <th class="cb-border-color border-bottom">Date</th>
                      <th class="cb-border-color border-bottom">Finished</th>
                      <th class="cb-border-color border-bottom">Task</th>
                      <th class="cb-border-color border-bottom">Status</th>
                      <th class="cb-border-color border-bottom">Result</th>
                      <th class="cb-border-color border-bottom"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <%= for g <- @user_games do %>
                      <tr>
                        <td class="text-white cb-border-color">{g.id}</td>
                        <td class="text-white cb-border-color">{g.inserted_at}</td>
                        <td class="text-white cb-border-color">{g.finishes_at}</td>
                        <td class="text-white cb-border-color">{g.task_name}</td>
                        <td class="cb-border-color">
                          <span class={"badge " <> (
                              case g.state do
                                "finished" -> "bg-success"
                                "timeout" -> "bg-warning text-dark"
                                _ -> "bg-secondary"
                              end
                            )}>
                            {String.capitalize(g.state)}
                          </span>
                        </td>
                        <td class="text-white cb-border-color">
                          {String.capitalize(to_string(g.result))}
                        </td>
                        <td class="cb-border-color">
                          <.link
                            href={Routes.game_path(@socket, :show, g.id)}
                            class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
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

    <%= if @show_modal do %>
      <div
        class="modal fade show"
        tabindex="-1"
        style="display: block; background-color: rgba(0,0,0,0.5);"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content cb-bg-panel cb-border-color border text-white">
            <div class="modal-header cb-border-color">
              <h5 class="modal-title text-white">Edit User Event</h5>
              <button
                type="button"
                class="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                data-bs-dismiss="modal"
                phx-click="close_modal"
              >
                Close
              </button>
            </div>
            <div class="modal-body">
              <form phx-submit="update_user_event_stages">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label for="userEventStatus" class="form-label text-white">
                      User Event Status
                    </label>
                    <select
                      class="form-select cb-bg-panel cb-border-color text-white"
                      id="userEventStatus"
                      name="status"
                      value={@user_event_form.status}
                    >
                      <%= for status <- UserEvent.statuses() do %>
                        <option value={status} selected={status == @user_event_form.status}>
                          {status}
                        </option>
                      <% end %>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label for="currentStageSlug" class="form-label text-white">
                      Current Stage Slug
                    </label>
                    <input
                      class="form-control cb-bg-panel cb-border-color text-white"
                      id="currentStageSlug"
                      name="current_stage_slug"
                      type="text"
                      value={@user_event_form.current_stage_slug}
                    />
                  </div>
                  <div class="col-md-6">
                    <label for="startedAt" class="form-label text-white">Started At</label>
                    <input
                      class="form-control font-monospace cb-bg-panel cb-border-color text-white"
                      id="startedAt"
                      name="started_at"
                      type="text"
                      value={@user_event_form.started_at}
                    />
                    <div class="form-text cb-text">Use ISO8601, e.g. `2026-03-15T12:00:00Z`.</div>
                  </div>
                  <div class="col-md-6">
                    <label for="finishedAt" class="form-label text-white">Finished At</label>
                    <input
                      class="form-control font-monospace cb-bg-panel cb-border-color text-white"
                      id="finishedAt"
                      name="finished_at"
                      type="text"
                      value={@user_event_form.finished_at}
                    />
                    <div class="form-text cb-text">Leave empty to clear it.</div>
                  </div>
                </div>
                <div class="mb-3 mt-3">
                  <label for="stagesJson" class="form-label text-white">Stages JSON</label>
                  <textarea
                    class="form-control font-monospace cb-bg-panel cb-border-color text-white"
                    id="stagesJson"
                    name="stages_json"
                    rows="15"
                  ><%= @stages_json %></textarea>
                  <div class="form-text cb-text">
                    Edit all per-stage fields here. Keep valid JSON and preserve `slug` for each row.
                  </div>
                </div>
                <div class="modal-footer cb-border-color">
                  <button
                    type="button"
                    class="btn btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                    phx-click="close_modal"
                  >
                    Close
                  </button>
                  <button type="submit" class="btn btn-success cb-rounded">Save changes</button>
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
