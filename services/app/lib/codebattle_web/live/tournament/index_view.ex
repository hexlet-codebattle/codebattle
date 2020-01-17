defmodule CodebattleWeb.Live.Tournament.IndexView do
  use Phoenix.LiveView
  use Timex

  @topic "tournaments"

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers

  def render(assigns) do
    CodebattleWeb.TournamentView.render("index.html", assigns)
  end

  def mount(session, socket) do
    CodebattleWeb.Endpoint.subscribe(@topic)

    {:ok,
     assign(socket,
       current_user: session[:current_user],
       tournaments: session[:tournaments],
       changeset: Codebattle.Tournament.changeset(%Codebattle.Tournament{})
     )}
  end

  def handle_event("validate", %{"tournament" => params}, socket) do
    creator_id = socket.assigns.current_user.id

    changeset =
      %Tournament{}
      |> Tournament.changeset(Map.merge(params, %{"creator_id" => creator_id}))
      |> Map.put(:action, :insert)

    {:noreply, assign(socket, changeset: changeset)}
  end

  def handle_event("create", %{"tournament" => params}, socket) do
    creator_id = socket.assigns.current_user.id

    case Helpers.create(Map.merge(params, %{"creator_id" => creator_id})) do
      {:ok, tournament} ->
        {:stop,
         socket
         |> redirect(to: "/tournaments/#{tournament.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end
end
