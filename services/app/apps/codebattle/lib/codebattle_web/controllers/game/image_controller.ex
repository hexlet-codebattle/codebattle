defmodule CodebattleWeb.Game.ImageController do
  use CodebattleWeb, :controller

  alias Codebattle.Game.Context

  @fake_html_to_image Application.compile_env(:codebattle, :fake_html_to_image, false)

  def show(conn, %{"game_id" => id}) do
    case Context.fetch_game(id) do
      {:ok, game} ->
        {:ok, image} =
          game
          |> prepare_image_html()
          |> generate_png()

        conn
        |> put_resp_content_type("image/png")
        |> send_resp(200, image)

      {:error, reason} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: inspect(reason)})
    end
  end

  defp prepare_image_html(game) do
    """
    <html style="background-color:#dee2e6;">
      <center style="padding:25px;">
        <img src="https://codebattle.hexlet.io/assets/images/logo.svg" alt="Logo">
        <span>The Codebattle</span>
        #{render_content(game)}
        <p>Made with <span style="color: #e25555;">&#9829;</span> by CodebattleCoreTeam</p>
        <p>Dear frontenders, pls, make it prettier, thx</p>
      </center>
    </html>
    """
  end

  defp render_content(%{players: []}) do
    """
    <p>Codebattle game</p>
    """
  end

  defp render_content(%{players: [player1]} = game) do
    """
    <p>Game state: #{game.state}</p>
    <p>Level: #{game.level}</p>
    #{render_player(player1)}
    """
  end

  defp render_content(%{players: [player1, player2]} = game) do
    """
    <p>Game state: #{game.state}</p>
    <p>Level: #{game.level}</p>
    #{render_player(player1)}
    <span style="font-size:77px;">VS</span>
    #{render_player(player2)}
    """
  end

  defp render_player(player) do
    """
    <div style="display:inline-block">
      <center>
      <img src="#{player.avatar_url}" style="width:46px; height:46px">
      <p>@#{player.name} (#{player.lang}) - #{player.rating}</p>
      </center>
    </div>
    """
  end

  defp generate_png(html_content) do
    if @fake_html_to_image do
      {:ok, html_content}
    else
      ChromicPDF.capture_screenshot({:html, html_content}, capture_screenshot: %{format: "png"})
    end
  end
end
