export async function renderPage(opt: {
    path: string;
    pageName: string;
    stylesheet?: string;
    script?: Array<string>;
    replace?: Record<string, string>;
}) {
    const content = await Bun.file(opt.path).text();

    let pageContent = `
    <!doctype html>
    <html lang="en" data-theme="caramellatte">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
      ${opt.stylesheet ? `<link rel="stylesheet" href="${opt.stylesheet}" />` : ""}
      <link href="https://cdn.jsdelivr.net/npm/daisyui@5" rel="stylesheet" type="text/css" />
      <link href="https://cdn.jsdelivr.net/npm/daisyui@5/themes.css" rel="stylesheet" type="text/css" />
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Anuphan:wght@100..700&family=Outfit:wght@100..900&display=swap" rel="stylesheet">
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
      <title>${opt.pageName}</title>
      <script src="https://www.youtube.com/iframe_api" async></script>
      <script src="/js/socket.io/socket.io.js"></script>
      <script src="/js/common.js"></script>
      <style>
        * {
            font-family: 'Outfit', 'Anuphan', sans-serif;
          }
    </style>
    </head>
    <body>
      ${content}
        ${opt.script ? opt.script.map(src => `<script src="${src}"></script>`).join("\n") : ""}
    </body>
    </html>
`;

    // Replace placeholders in the content
    if (opt.replace) {
        for (const [key, value] of Object.entries(opt.replace)) {
            pageContent = pageContent.replace(new RegExp(key, "g"), value);
        }
    }

    return pageContent;
}
