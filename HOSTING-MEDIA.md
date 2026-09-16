# 🖼️ Guia de Hospedagem de Mídia — imagens, vídeos e capturas

> O GitHub Pages **não é um CDN de mídia**: o repositório tem limite prático de ~1 GB
> e o Pages recomenda sites leves; arquivos grandes deixam o deploy lento e o site pesado.
> Por isso o site foi preparado para consumir mídia de **serviços externos via URL**.

## Regra de bolso
- **Imagens das obras / capturas**: serviço de imagem (Cloudinary) ou CDN de arquivos.
- **Vídeos de desenvolvimento do software**: YouTube (não listado) ou Vimeo — o campo
  "Video URL" do Creator Studio aceita link de embed OU um `.mp4` direto.
- **Arquivos pesados (.psd, .zip, builds de teste)**: use **GitHub Releases** do repo
  (Releases NÃO contam para o site e permitem arquivos de até 2 GB) — link para a release
  no post do studio.

## Opções recomendadas (nível "zero custo")

| Serviço | Use para | Como |
|---|---|---|
| **Cloudinary** (plano free) | Obras, avatar, capturas | Upload → copiar URL → colar no campo `imageUrl` / no studio |
| **YouTube — vídeo "não listado"** | Vídeos de dev do software | "Não listado" = só quem tem o link vê; cole o link normal no campo `video` do post |
| **Vimeo** | Alternativa mais elegante | Plano free permite embed |
| **catbox.moe / tmpsend** | Arquivos soltos rápidos | Direto no campo `link` de um post |
| **GitHub Releases** | Builds/ZIPs grandes | Repo → Releases → New release → anexe arquivos → copie o link do asset |

## Evite
- **Imgur**: apaga mídia antiga sem aviso — ruim para portfólio permanente.
- **Compressão automática do Discord/WhatsApp** nos links diretos (expiram).
- **NSFW em hosts que proíbem** — o admin já avisa: use Cloudinary (permite adultos com conta adequada) ou host específico de arte adulta, **nunca** o repositório (risco de suspensão do Pages).

## Como fica no site (sem editar código)
- **Obra nova**: Creator Studio → Artworks → "+ Add Artwork" → cole a URL da imagem.
- **Post com vídeo**: Creator Studio → Software → "+ Add Entry" → campo
  *"Video URL (YouTube/Vimeo/.mp4)"*. O site detecta: link de vídeo → player embutido;
  arquivo `.mp4`/`.webm` → player nativo.
- A **CSP do site já permite** `https:` para imagens, vídeos e iframes — nada a configurar.

## Limites da CSP (segurança)
O site permite `https:` genérico para mídia. Se quiser apertar (recomendado depois de
escolher seus serviços definitivos), troque no `<meta CSP>` das páginas:
`img-src ... https:` → `img-src 'self' https://res.cloudinary.com` e
`frame-src https:` → `frame-src https://www.youtube.com https://player.vimeo.com`.
