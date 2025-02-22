defmodule CodebattleWeb.Tournament.ImageController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  alias Codebattle.Tournament

  def show(conn, %{"id" => id}) do
    # TODO: add ETS cache for image
    case Tournament.Context.get(id) do
      nil ->
        send_resp(conn, :ok, "")

      tournament ->
        html_content = render_image(tournament)
        {:ok, image} = generate_png(html_content)

        conn
        |> put_resp_content_type("image/png")
        |> send_resp(200, Base.decode64!(image))
    end
  end

  defp render_image(tournament) do
    """
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body {
            margin: 0;
            padding: 0;
            /* Let them expand to the “browser” size (which we'll define via ChromicPDF) */
            width: 100%;
            height: 100%;
            background: #f5f7fa;
            font-family: 'Helvetica Neue', Arial, sans-serif; /* Change to desired font */
          }
          .card {
            /* Fill the entire viewport */
            width: 100%;
            height: 100%;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            background: #000; /* Dark background */
            font-family: 'Helvetica Neue', Arial, sans-serif; /* Change to desired font */
            color: #fff; /* White text */
            text-align: center;
          }
          .header img {
            width: 60px;
            height: auto;
          }
          .content {
            flex: 1;
            padding: 10px;
            color: #333;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #aaa;
            padding: 5px;
            background: #f0f0f0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <img src="#{logo_url()}" alt="Logo">
            <h1>#{tournament.name}</h1>
          </div>
          <div class="content">
            #{render_content(tournament)}
          </div>
          <div class="footer">
            Made with ♥ by Codebattle
          </div>
        </div>
      </body>
    </html>
    """
  end

  defp logo_url do
    if logo = Application.get_env(:codebattle, :collab_logo) do
      logo
    else
      "https://codebattle.hexlet.io/assets/images/logo.svg"
    end
  end

  defp render_content(tournament) do
    type = to_string(tournament.type)
    state = to_string(tournament.state)

    """
    <h4>#{gettext("Type: %{type}", type: type)}</h4>
    <h4>#{gettext("State: %{state}", state: state)}</h4>
    <h4>#{gettext("Starts At")}: #{tournament.starts_at} UTC</h4>
    """
  end

  defp generate_png(html_content) do
    ChromicPDF.capture_screenshot({:html, html_content}, capture_screenshot: %{format: "png"})
  end
end
