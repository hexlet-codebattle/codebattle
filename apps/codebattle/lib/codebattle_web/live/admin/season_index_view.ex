defmodule CodebattleWeb.Live.Admin.Season.IndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Season

  @impl true
  def mount(_params, _session, socket) do
    seasons = Season.get_all()
    changeset = Season.changeset(%Season{})

    {:ok,
     assign(socket,
       seasons: seasons,
       changeset: changeset,
       show_form: false,
       layout: {CodebattleWeb.LayoutView, :admin}
     )}
  end

  @impl true
  def handle_event("show_form", _params, socket) do
    changeset = Season.changeset(%Season{})
    {:noreply, assign(socket, show_form: true, changeset: changeset)}
  end

  def handle_event("hide_form", _params, socket) do
    {:noreply, assign(socket, show_form: false)}
  end

  def handle_event("validate", %{"season" => season_params}, socket) do
    changeset =
      %Season{}
      |> Season.changeset(season_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, changeset: changeset)}
  end

  def handle_event("create", %{"season" => season_params}, socket) do
    case Season.create(season_params) do
      {:ok, _season} ->
        seasons = Season.get_all()

        {:noreply,
         socket
         |> assign(seasons: seasons, show_form: false)
         |> put_flash(:info, "Season created successfully")}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  def handle_event("delete", %{"id" => id}, socket) do
    season = Season.get!(id)

    case Season.delete(season) do
      {:ok, _season} ->
        seasons = Season.get_all()

        {:noreply,
         socket
         |> assign(seasons: seasons)
         |> put_flash(:info, "Season deleted successfully")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to delete season")}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="cb-container-xl cb-bg-panel cb-shadow-sm cb-rounded cb-py-4 cb-mt-3">
      <div class="cb-d-flex cb-justify-between cb-align-center cb-mb-4">
        <h1 class="cb-text-white">
          <i class="bi bi-calendar-range"></i> Season Management
        </h1>
        <button
          :if={!@show_form}
          class="cb-btn cb-btn-secondary cb-rounded"
          phx-click="show_form"
        >
          <i class="bi bi-plus-circle"></i> New Season
        </button>
      </div>

      <%= if @show_form do %>
        <div class="cb-card cb-shadow-sm cb-mb-4 cb-border cb-border-color">
          <div class="cb-card-header cb-bg-highlight-panel cb-border-color cb-text-white">
            <div class="cb-d-flex cb-justify-between cb-align-center">
              <span><i class="bi bi-plus-circle"></i> Create New Season</span>
              <button
                class="cb-btn cb-btn-sm cb-btn-outline-secondary cb-rounded"
                phx-click="hide_form"
              >
                <i class="bi bi-x"></i> Cancel
              </button>
            </div>
          </div>
          <div class="cb-card-body">
            <.form
              :let={f}
              for={@changeset}
              phx-change="validate"
              phx-submit="create"
              class="cb-row g-3"
            >
              <div class="cb-col-md-6">
                {label(f, :name, class: "form-label")}
                {text_input(f, :name,
                  class: "cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded",
                  placeholder: "e.g., Spring Season"
                )}
                {error_tag(f, :name)}
              </div>

              <div class="cb-col-md-6">
                {label(f, :year, class: "form-label")}
                {number_input(f, :year,
                  class: "cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded",
                  placeholder: "e.g., 2024"
                )}
                {error_tag(f, :year)}
              </div>

              <div class="cb-col-md-6">
                {label(f, :starts_at, "Start Date", class: "form-label")}
                {date_input(f, :starts_at,
                  class: "cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded"
                )}
                {error_tag(f, :starts_at)}
              </div>

              <div class="cb-col-md-6">
                {label(f, :ends_at, "End Date", class: "form-label")}
                {date_input(f, :ends_at,
                  class: "cb-form-control cb-bg-panel cb-border-color cb-text-white cb-rounded"
                )}
                {error_tag(f, :ends_at)}
              </div>

              <div class="cb-col-12">
                {submit("Create Season",
                  class: "cb-btn cb-btn-secondary cb-rounded",
                  phx_disable_with: "Creating..."
                )}
              </div>
            </.form>
          </div>
        </div>
      <% end %>

      <div class="cb-card cb-shadow-sm cb-border cb-border-color">
        <div class="cb-card-body">
          <%= if @seasons == [] do %>
            <div class="cb-text-center cb-text cb-py-5">
              <i class="bi bi-calendar-x" style="font-size: 3rem;"></i>
              <p class="cb-mt-3">No seasons found. Create your first season!</p>
            </div>
          <% else %>
            <div class="cb-table-responsive">
              <table class="cb-table cb-table-sm cb-table-hover">
                <thead class="cb-text">
                  <tr>
                    <th class="cb-border-color cb-border-bottom">ID</th>
                    <th class="cb-border-color cb-border-bottom">Name</th>
                    <th class="cb-border-color cb-border-bottom">Year</th>
                    <th class="cb-border-color cb-border-bottom">Start Date</th>
                    <th class="cb-border-color cb-border-bottom">End Date</th>
                    <th class="cb-border-color cb-border-bottom">Duration</th>
                    <th class="cb-border-color cb-border-bottom">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <%= for season <- @seasons do %>
                    <tr>
                      <td class="cb-text-white cb-border-color">{season.id}</td>
                      <td class="cb-text-white cb-border-color"><strong>{season.name}</strong></td>
                      <td class="cb-text-white cb-border-color">{season.year}</td>
                      <td class="cb-text-white cb-border-color">
                        {Calendar.strftime(season.starts_at, "%b %d, %Y")}
                      </td>
                      <td class="cb-text-white cb-border-color">
                        {Calendar.strftime(season.ends_at, "%b %d, %Y")}
                      </td>
                      <td class="cb-text-white cb-border-color">
                        {Date.diff(season.ends_at, season.starts_at)} days
                      </td>
                      <td class="cb-border-color">
                        <div class="cb-btn-group" role="group">
                          <a
                            href={Routes.admin_season_show_view_path(@socket, :show, season.id)}
                            class="cb-btn cb-btn-sm cb-btn-outline-secondary cb-btn-outline-secondary"
                          >
                            <i class="bi bi-eye"></i> View
                          </a>
                          <a
                            href={Routes.admin_season_edit_view_path(@socket, :edit, season.id)}
                            class="cb-btn cb-btn-sm cb-btn-outline-secondary"
                          >
                            <i class="bi bi-pencil"></i> Edit
                          </a>
                          <button
                            class="cb-btn cb-btn-sm cb-btn-outline-danger"
                            phx-click="delete"
                            phx-value-id={season.id}
                            data-confirm="Are you sure you want to delete this season?"
                          >
                            <i class="bi bi-trash"></i> Delete
                          </button>
                        </div>
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
    """
  end
end
