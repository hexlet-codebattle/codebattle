defmodule CodebattleWeb.Live.Tournament.EditView do
  use CodebattleWeb, :live_view
  use Timex

  import Ecto.Changeset

  require Logger

  alias Codebattle.Tournament
  alias CodebattleWeb.Live.Tournament.EditFormComponent

  @impl true
  def mount(_params, session, socket) do
    user_timezone = get_in(socket.private, [:connect_params, "timezone"]) || "UTC"
    tournament = session["tournament"]

    {:ok,
     assign(socket,
       current_user: session["current_user"],
       user_timezone: user_timezone,
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
        user_timezone={@user_timezone}
        changeset={@changeset}
        langs={Runner.Languages.get_lang_slugs()}
      />
    </div>
    """
  end

  @impl true
  def handle_event("validate", %{"tournament" => params}, socket) do
    creator = socket.assigns.current_user
    user_timezone = socket.assigns.user_timezone
    tournament = socket.assigns.tournament

    changeset =
      Tournament.Context.validate(
        Map.merge(params, %{"user_timezone" => user_timezone, "creator" => creator}),
        tournament
      )

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
    user_timezone = socket.assigns.user_timezone
    tournament = Tournament.Context.get!(params["tournament_id"])

    case Tournament.Context.update(
           tournament,
           Map.merge(params, %{"creator" => creator, "user_timezone" => user_timezone})
         ) do
      {:ok, tournament} ->
        {:noreply,
         socket
         |> redirect(to: "/tournaments/#{tournament.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end
end
