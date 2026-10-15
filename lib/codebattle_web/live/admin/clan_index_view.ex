defmodule CodebattleWeb.Live.Admin.Clan.IndexView do
  use CodebattleWeb, :live_view

  alias Codebattle.Clan

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(
       clans: [],
       changeset: Clan.changeset(%Clan{}),
       form_mode: nil,
       query: "",
       selected_clan: nil,
       layout: {CodebattleWeb.LayoutView, :admin}
     )
     |> load_clans()}
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    {:noreply,
     socket
     |> assign(query: String.trim(query))
     |> load_clans()}
  end

  def handle_event("new", _params, socket) do
    {:noreply,
     assign(socket,
       changeset: Clan.changeset(%Clan{}),
       form_mode: :new,
       selected_clan: nil
     )}
  end

  def handle_event("edit", %{"id" => id}, socket) do
    clan = Clan.get!(id)

    {:noreply,
     assign(socket,
       changeset: Clan.changeset(clan),
       form_mode: :edit,
       selected_clan: clan
     )}
  end

  def handle_event("cancel", _params, socket) do
    {:noreply,
     assign(socket,
       changeset: Clan.changeset(%Clan{}),
       form_mode: nil,
       selected_clan: nil
     )}
  end

  def handle_event("validate", %{"clan" => clan_params}, socket) do
    clan = socket.assigns.selected_clan || %Clan{}

    changeset =
      clan
      |> Clan.changeset(clan_params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, changeset: changeset)}
  end

  def handle_event("save", %{"clan" => clan_params}, %{assigns: %{form_mode: :new}} = socket) do
    case Clan.create(clan_params) do
      {:ok, _clan} ->
        {:noreply,
         socket
         |> assign(
           changeset: Clan.changeset(%Clan{}),
           form_mode: nil,
           selected_clan: nil
         )
         |> load_clans()
         |> put_flash(:info, "Clan created successfully")}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  def handle_event("save", %{"clan" => clan_params}, %{assigns: %{form_mode: :edit}} = socket) do
    case Clan.update(socket.assigns.selected_clan, clan_params) do
      {:ok, _clan} ->
        {:noreply,
         socket
         |> assign(
           changeset: Clan.changeset(%Clan{}),
           form_mode: nil,
           selected_clan: nil
         )
         |> load_clans()
         |> put_flash(:info, "Clan updated successfully")}

      {:error, changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end

  def handle_event("delete", %{"id" => id}, socket) do
    clan = Clan.get!(id)

    case Clan.delete(clan) do
      {:ok, _clan} ->
        {:noreply,
         socket
         |> load_clans()
         |> put_flash(:info, "Clan deleted successfully")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to delete clan")}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container-xl cb-bg-panel shadow-sm cb-rounded py-4 mt-3">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="mb-1 text-white">Clan Management</h1>
          <p class="cb-text mb-0">Create, edit, delete, and search clans.</p>
        </div>

        <button
          :if={is_nil(@form_mode)}
          type="button"
          class="btn btn-secondary cb-btn-secondary cb-rounded"
          phx-click="new"
        >
          <i class="bi bi-plus-circle"></i> New Clan
        </button>
      </div>

      <%= if @form_mode do %>
        <div class="card cb-card shadow-sm mb-4 border cb-border-color">
          <div class="card-header cb-bg-highlight-panel cb-border-color text-white">
            <div class="d-flex justify-content-between align-items-center">
              <span>{form_title(@form_mode)}</span>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary cb-btn-outline-secondary cb-rounded"
                phx-click="cancel"
              >
                <i class="bi bi-x"></i> Cancel
              </button>
            </div>
          </div>
          <div class="card-body">
            <.form
              :let={f}
              id="clan-form"
              for={@changeset}
              phx-change="validate"
              phx-submit="save"
              class="row g-3"
            >
              <div class="col-md-4">
                {label(f, :name, class: "form-label")}
                {text_input(f, :name,
                  class: "form-control cb-bg-panel cb-border-color text-white cb-rounded",
                  placeholder: "Short clan name"
                )}
                {error_tag(f, :name)}
              </div>

              <div class="col-md-5">
                {label(f, :long_name, class: "form-label")}
                {text_input(f, :long_name,
                  class: "form-control cb-bg-panel cb-border-color text-white cb-rounded",
                  placeholder: "Full clan name"
                )}
                {error_tag(f, :long_name)}
              </div>

              <div class="col-md-3">
                {label(f, :creator_id, class: "form-label")}
                {number_input(f, :creator_id,
                  class: "form-control cb-bg-panel cb-border-color text-white cb-rounded",
                  placeholder: "Creator user ID"
                )}
                {error_tag(f, :creator_id)}
              </div>

              <div class="col-12">
                {submit(submit_label(@form_mode),
                  class: "btn btn-secondary cb-btn-secondary cb-rounded",
                  phx_disable_with: "Saving..."
                )}
              </div>
            </.form>
          </div>
        </div>
      <% end %>

      <div class="d-flex align-items-center mb-3">
        <form
          id="clan-search-form"
          phx-submit="search"
          phx-change="search"
          class="d-flex align-items-center"
        >
          <input
            class="form-control cb-bg-panel cb-border-color text-white cb-rounded"
            type="text"
            name="query"
            value={@query}
            phx-debounce="300"
            placeholder="Search by name or long name"
          />
          <button class="btn btn-secondary cb-btn-secondary cb-rounded ml-2" type="submit">
            Search
          </button>
        </form>
      </div>

      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <%= if @clans == [] do %>
            <tbody>
              <tr>
                <td colspan="7" class="cb-border-color text-center cb-text py-4">
                  No clans found.
                </td>
              </tr>
            </tbody>
          <% else %>
            <thead class="cb-text">
              <tr>
                <th class="cb-border-color border-bottom">ID</th>
                <th class="cb-border-color border-bottom">Name</th>
                <th class="cb-border-color border-bottom">Long Name</th>
                <th class="cb-border-color border-bottom">Creator</th>
                <th class="cb-border-color border-bottom">Users</th>
                <th class="cb-border-color border-bottom">Inserted</th>
                <th class="cb-border-color border-bottom"></th>
              </tr>
            </thead>
            <tbody>
              <%= for clan <- @clans do %>
                <tr>
                  <td class="align-middle text-white cb-border-color">{clan.id}</td>
                  <td class="align-middle text-white cb-border-color">
                    <strong>{clan.name}</strong>
                  </td>
                  <td class="align-middle text-white cb-border-color">{clan.long_name || "–"}</td>
                  <td class="align-middle text-white cb-border-color">
                    {creator_name(clan)}
                  </td>
                  <td class="align-middle text-white cb-border-color">{length(clan.users || [])}</td>
                  <td class="align-middle text-white cb-border-color">{clan.inserted_at}</td>
                  <td class="align-middle cb-border-color text-end">
                    <div class="btn-group btn-group-sm">
                      <a
                        href={Routes.clan_path(@socket, :show, clan.id)}
                        class="btn btn-outline-secondary cb-btn-outline-secondary"
                      >
                        Show
                      </a>
                      <button
                        type="button"
                        class="btn btn-outline-secondary cb-btn-outline-secondary"
                        phx-click="edit"
                        phx-value-id={clan.id}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-danger"
                        phx-click="delete"
                        phx-value-id={clan.id}
                        data-confirm="Delete this clan?"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              <% end %>
            </tbody>
          <% end %>
        </table>
      </div>
    </div>
    """
  end

  defp load_clans(socket) do
    assign(socket, clans: Clan.search(socket.assigns.query, [:creator, :users]))
  end

  defp creator_name(%{creator: %{name: name}}), do: name
  defp creator_name(_clan), do: "–"

  defp form_title(:new), do: "Create New Clan"
  defp form_title(:edit), do: "Edit Clan"

  defp submit_label(:new), do: "Create Clan"
  defp submit_label(:edit), do: "Update Clan"
end
