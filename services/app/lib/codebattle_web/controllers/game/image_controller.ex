defmodule CodebattleWeb.Game.ImageController do
  use CodebattleWeb, :controller

  alias Codebattle.GameProcess.{Play, FsmHelpers}

  def show(conn, %{"id" => id}) do
    case get_game_data(id) do
      {:ok, users, game} ->
        {:ok, image} =
          {users, game}
          |> render_image
          |> HtmlToImage.convert(width: 637, quality: 100)

        conn
        |> put_resp_content_type("image/jpeg")
        |> send_resp(200, image)

      _ ->
        send_resp(conn, :ok, "")
    end
  end

  defp get_game_data(id) do
    case Play.get_fsm(id) do
      {:ok, fsm} ->
        {:ok, FsmHelpers.get_players(fsm),
         %{
           state: FsmHelpers.get_state(fsm),
           level: FsmHelpers.get_level(fsm)
         }}

      {:error, _reason} ->
        case Play.get_game(id) do
          nil ->
            {:error, :not_found}

          game ->
            {:ok, game.users,
             %{
               state: game.state,
               level: game.level
             }}
        end
    end
  end

  defp render_image({users, game}) do
    ~s(<html style="background-color:#dee2e6;">
      <center style="padding:25px;">
      <img src="https://codebattle.hexlet.io/assets/images/logo.svg" alt="Logo">
      <span>The Codebattle</span>
      #{render_content({users, game})}
      <p>Made with <span style="color: #e25555;">&#9829;</span> by CodebattleCoreTeam</p>
      <p>Dear frontenders, pls, make it prettier, thx</p>
      </center>
    </html>)
  end

  defp render_content({[], _game}) do
    ~s( <p>Game not found </p> )
  end

  defp render_content({[u1], game}) do
    ~s(
      <p>Game state: #{game.state}</p>
      <p>Level: #{game.level}</p>
      #{render_user(u1)}
    )
  end

  defp render_content({[u1, u2], game}) do
    ~s(
    <p>Game state: #{game.state}</p>
    <p>Level: #{game.level}</p>
    #{render_user(u1)}
    <span style="font-size:77px;">VS</span>
    #{render_user(u2)}
    )
  end

  defp render_user(u) do
    ~s(
    <div style="display:inline-block">
      <center>
      <img src="https://avatars0.githubusercontent.com/u/#{u.github_id}" style="width:46px; height:46px">
      <p>@#{u.name}\(#{u.lang}\)-#{u.rating}</p>
      </center>
    </div>
    )
  end
end
