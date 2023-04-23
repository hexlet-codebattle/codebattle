defmodule CodebattleWeb.Live.Tournament.EditView do
  use CodebattleWeb, :live_view
  use Timex

  import Ecto.Changeset

  require Logger

  alias Codebattle.Tournament
  alias CodebattleWeb.Live.Tournament.EditFormComponent

  @impl true
  def mount(_params, session, socket) do
    tournament = session["tournament"]

    {:ok,
     assign(socket,
       current_user: session["current_user"],
       tournament: tournament,
       changeset: Codebattle.Tournament.changeset(tournament)
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.live_component
        id="create-form"
        module={EditFormComponent}
        tournament={@tournament}
        changeset={@changeset}
        langs={Runner.Languages.get_lang_slugs()}
      />
    </div>
    """
  end

  @impl true
  def handle_event("validate", %{"tournament" => params}, socket) do
    creator = socket.assigns.current_user
    tournament = socket.assigns.tournament

    changeset =
      Tournament.Context.validate(Map.merge(params, %{"creator" => creator}), tournament)

    case apply_action(changeset, :validate) do
      {:ok, tournament} ->
        {:noreply,
         assign(socket,
           tournament: tournament,
           changeset: changeset
         )}

      {:error, changeset} ->
        {:noreply,
         assign(socket,
           tournament: tournament,
           changeset: changeset
         )}
    end
  end

  @impl true
  def handle_event("update", %{"tournament" => params}, socket) do
    creator = socket.assigns.current_user
    tournament = Tournament.Context.get!(params["tournament_id"])

    case Tournament.Context.update(tournament, Map.merge(params, %{"creator" => creator})) do
      {:ok, tournament} ->
        {:noreply,
         socket
         |> redirect(to: "/tournaments/#{tournament.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end
end
