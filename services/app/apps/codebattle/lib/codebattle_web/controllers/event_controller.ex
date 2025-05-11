defmodule CodebattleWeb.EventController do
  use CodebattleWeb, :controller

  alias Codebattle.Event

  plug(CodebattleWeb.Plugs.AdminOnly)

  def index(conn, _params) do
    conn
    |> put_meta_tags(%{title: "Codebattle Events"})
    |> render("index.html", %{events: Event.get_all(), user: conn.assigns.current_user})
  end

  def new(conn, _params) do
    render(conn, "new.html", changeset: Codebattle.Event.changeset(%Codebattle.Event{}), user: conn.assigns.current_user)
  end

  def show(conn, %{"id" => id}) do
    event = Event.get!(id)

    conn
    |> put_meta_tags(%{title: event.title})
    |> render("show.html", %{event: event, user: conn.assigns.current_user})
  end

  def create(conn, %{"event" => event_params}) do
    user = conn.assigns.current_user
    params = Map.put(event_params, "user_id", user.id)

    # Handle stages JSON if present
    params = process_stages_json(params)

    case Codebattle.Event.create(params) do
      {:ok, event} ->
        conn
        |> put_flash(:info, "Event created successfully.")
        |> redirect(to: Routes.event_path(conn, :show, event))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset, user: user)
    end
  end

  def update(conn, %{"id" => id, "event" => event_params}) do
    event = Event.get!(id)

    # Handle stages JSON if present
    event_params = process_stages_json(event_params)

    case Codebattle.Event.update(
           event,
           Map.put(event_params, "creator_id", conn.assigns.current_user.id)
         ) do
      {:ok, event} ->
        conn
        |> put_flash(:info, "Event updated successfully.")
        |> redirect(to: Routes.event_path(conn, :show, event))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", event: event, changeset: changeset, user: conn.assigns.current_user)
    end
  end

  def edit(conn, %{"id" => id}) do
    event = Event.get!(id)

    changeset = Codebattle.Event.changeset(event)
    render(conn, "edit.html", event: event, changeset: changeset, user: conn.assigns.current_user)
  end

  def delete(conn, %{"id" => id}) do
    event = Event.get!(id)

    Event.delete(event)

    conn
    |> put_flash(:info, gettext("Event deleted!"))
    |> redirect(to: Routes.event_path(conn, :index))
  end

  # Process stages JSON data from form
  defp process_stages_json(%{"stages_json" => stages_json} = params) when is_binary(stages_json) and stages_json != "" do
    with {:ok, stages_data} <- Jason.decode(stages_json),
         true <- is_list(stages_data) do
      stages =
        Enum.map(stages_data, fn stage ->
          # Ensure required fields are present
          Map.new(stage, fn {k, v} -> {String.to_atom(k), v} end)
        end)

      # Replace stages_json with stages
      params
      |> Map.delete("stages_json")
      |> Map.put("stages", stages)
    else
      _ ->
        # Invalid format - not a list or invalid JSON
        params
    end
  end

  defp process_stages_json(params), do: params
end
