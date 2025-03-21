defmodule CodebattleWeb.Tournament.ImageController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  alias Codebattle.Tournament
  alias CodebattleWeb.HtmlImage

  def show(conn, %{"id" => id}) do
    case Tournament.Context.get(id) do
      nil ->
        send_resp(conn, :ok, "")

      tournament ->
        cache_key = "t_#{id}_#{tournament.state}"
        html = prepare_image_html(tournament)
        HtmlImage.render_image(conn, cache_key, html)
    end
  end

  defp prepare_image_html(tournament) do
    """
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #f5f7fa;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }
          p {
            margin: 5px;
            padding: 5px;
          }
          .card {
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
            background: #000;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #fff;
            text-align: center;
          }
          .header img {
            width: 100px;
            margin-top: 20px;
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
            font-size: 12px;
            color: #fff;
            padding: 8px;
            background: #000;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <img src="#{HtmlImage.logo_url()}" alt="Logo">
            <h1>#{tournament.name}</h1>
          </div>
          <div class="content">
            #{render_content(tournament)}
          </div>
          <div class="footer">
            <p>
              Made with
              <svg width="14" height="14" viewBox="0 0 24 24" style="fill:#ff5252; vertical-align:middle;">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42
                         4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81
                         14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4
                         6.86-8.55 11.54L12 21.35z"/>
              </svg>
              by Codebattle
            </p>
          </div>
        </div>
      </body>
    </html>
    """
  end

  defp render_content(tournament) do
    type = Gettext.gettext(CodebattleWeb.Gettext, to_string(tournament.type))
    state = Gettext.gettext(CodebattleWeb.Gettext, "Tournament #{tournament.state}")

    """
    <p>#{gettext("Type: %{type}", type: type)}</p>
    <p>#{state}</p>
    <p>#{gettext("Starts At")}: #{tournament.starts_at} UTC</p>
    """
  end
end
