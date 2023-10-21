defmodule CodebattleWeb.Tournament.ImageController do
  use CodebattleWeb, :controller

  alias Codebattle.Tournament

  def show(conn, %{"id" => id}) do
    # TODO: add ets cache for image
    case Tournament.Context.get(id) do
      nil ->
        send_resp(conn, :ok, "")

      tournament ->
        {:ok, image} =
          tournament
          |> render_image
          |> HtmlToImage.convert(width: 777, quality: 100)

        conn
        |> put_resp_content_type("image/jpeg")
        |> send_resp(200, image)
    end
  end

  defp render_image(tournament) do
    ~s(<html style="background-color:#dee2e6;">
      <center style="padding:25px;">
      <img src="https://codebattle.hexlet.io/assets/images/logo.svg" alt="Logo">
      <span>The Codebattle</span>
      <h1>Tournament</h1>
      #{render_content(tournament)}
      <p>Made with <span style="color: #e25555;">&#9829;</span> by CodebattleCoreTeam</p>
      <p>Dear frontenders, pls, make it prettier, thx</p>
      </center>
    </html>)
  end

  defp render_content(tournament) do
    ~s(
      <h3>#{tournament.name}</h3>
      <h4>Type: #{tournament.type}/#{tournament.level}</h4>
      <h4></h4>
      <h4>State: #{tournament.state}</h4>
      <h4>StartsAt: #{tournament.starts_at} UTC</h4>
      <p>Creator</p>
      <h4>#{render_user(tournament.creator)}</h4>

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
