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
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
      ${opt.stylesheet ? `<link rel="stylesheet" href="${opt.stylesheet}" />` : ""}
      <title>${opt.pageName}</title>
      <script src="https://www.youtube.com/iframe_api" async></script>
      <script src="/js/socket.io/socket.io.js"></script>
      <script src="/js/common.js"></script>
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
