defmodule CodebattleWeb.Live.Tournament.EditView do
  use CodebattleWeb, :live_view
  use Timex

  import Ecto.Changeset

  alias Codebattle.Tournament
  alias CodebattleWeb.Live.Tournament.EditFormComponent

  require Logger

  @impl true
  def mount(_params, session, socket) do
    user_timezone = get_in(socket.private, [:connect_params, "timezone"]) || "UTC"
    tournament = session["tournament"]

    {:ok,
     assign(socket,
       current_user: session["current_user"],
       user_timezone: user_timezone,
       tournament: tournament,
       changeset:
         Tournament.changeset(tournament, %{
           type: tournament.type,
           task_provider: tournament.task_provider,
           starts_at: tournament.starts_at |> DateTime.shift_zone!(user_timezone) |> to_string(),
           meta_json: Jason.encode!(tournament.meta)
         })
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
        task_pack_names={@current_user |> Codebattle.TaskPack.list_visible() |> Enum.map(& &1.name)}
      />
    </div>
    """
  end

  @impl true
  def handle_event("validate", %{"tournament" => params}, socket) do
    user_timezone = socket.assigns.user_timezone
    tournament = socket.assigns.tournament

    changeset =
      Tournament.Context.validate(
        Map.put(params, "user_timezone", user_timezone),
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
    user_timezone = socket.assigns.user_timezone
    tournament = Tournament.Context.get!(params["tournament_id"])

    case Tournament.Context.update(
           tournament,
           Map.put(params, "user_timezone", user_timezone)
         ) do
      {:ok, tournament} ->
        {:noreply, redirect(socket, to: "/tournaments/#{tournament.id}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, changeset: changeset)}
    end
  end
end
