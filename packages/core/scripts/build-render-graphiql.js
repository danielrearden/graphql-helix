const { execSync } = require("child_process");
const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");

execSync("yarn workspace @graphql-helix/graphiql build", {
  cwd: resolve(__dirname, "../../.."),
  stdio: "inherit",
});

const javascript = readFileSync(
  resolve(__dirname, "../../graphiql/dist/graphiql.min.js"),
  "utf8"
);
const css = readFileSync(
  resolve(__dirname, "../../graphiql/dist/graphiql.min.css"),
  "utf8"
);

const contents = `import { RenderGraphiQLOptions } from "./types";

const safeSerialize = (value: any) => {
  return value != null
    ? JSON.stringify(value).replace(/\\//g, "\\\\/")
    : "undefined";
};

export const renderGraphiQL = (options: RenderGraphiQLOptions = {}): string => {
  const {
    defaultQuery,
    defaultVariableEditorOpen,
    endpoint,
    headers,
    headerEditorEnabled,
    nonce,
    subscriptionsEndpoint,
    useWebSocketLegacyProtocol,
    hybridSubscriptionTransportConfig,
  } = options;
  const nonceAttribute = nonce ? \`nonce="\${nonce}"\` : "";
  const css = ${JSON.stringify(css)};
  const javascript = ${JSON.stringify(javascript).replace(
    "</script>",
    "<\\/script>"
  )};

  return \`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>GraphiQL</title>
    <meta name="robots" content="noindex" />
    <meta name="referrer" content="origin" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="icon"
      type="image/svg+xml"
      href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cpath fill='%23E535AB' d='M57.468 302.66l-14.376-8.3 160.15-277.38 14.376 8.3z'/%3E%3Cpath fill='%23E535AB' d='M39.8 272.2h320.3v16.6H39.8z'/%3E%3Cpath fill='%23E535AB' d='M206.348 374.026l-160.21-92.5 8.3-14.376 160.21 92.5zM345.522 132.947l-160.21-92.5 8.3-14.376 160.21 92.5z'/%3E%3Cpath fill='%23E535AB' d='M54.482 132.883l-8.3-14.375 160.21-92.5 8.3 14.376z'/%3E%3Cpath fill='%23E535AB' d='M342.568 302.663l-160.15-277.38 14.376-8.3 160.15 277.38zM52.5 107.5h16.6v185H52.5z'/%3E%3Cpath fill='%23E535AB' d='M330.9 107.5h16.6v185h-16.6z'/%3E%3Cpath fill='%23E535AB' d='M203.522 367l-7.25-12.558 139.34-80.45 7.25 12.557z'/%3E%3Cpath fill='%23E535AB' d='M369.5 297.9c-9.6 16.7-31 22.4-47.7 12.8-16.7-9.6-22.4-31-12.8-47.7 9.6-16.7 31-22.4 47.7-12.8 16.8 9.7 22.5 31 12.8 47.7M90.9 137c-9.6 16.7-31 22.4-47.7 12.8-16.7-9.6-22.4-31-12.8-47.7 9.6-16.7 31-22.4 47.7-12.8 16.7 9.7 22.4 31 12.8 47.7M30.5 297.9c-9.6-16.7-3.9-38 12.8-47.7 16.7-9.6 38-3.9 47.7 12.8 9.6 16.7 3.9 38-12.8 47.7-16.8 9.6-38.1 3.9-47.7-12.8M309.1 137c-9.6-16.7-3.9-38 12.8-47.7 16.7-9.6 38-3.9 47.7 12.8 9.6 16.7 3.9 38-12.8 47.7-16.7 9.6-38.1 3.9-47.7-12.8M200 395.8c-19.3 0-34.9-15.6-34.9-34.9 0-19.3 15.6-34.9 34.9-34.9 19.3 0 34.9 15.6 34.9 34.9 0 19.2-15.6 34.9-34.9 34.9M200 74c-19.3 0-34.9-15.6-34.9-34.9 0-19.3 15.6-34.9 34.9-34.9 19.3 0 34.9 15.6 34.9 34.9 0 19.3-15.6 34.9-34.9 34.9'/%3E%3C/svg%3E"
      \${nonceAttribute}
    />
    <style \${nonceAttribute}>
      body {
        height: 100vh;
        margin: 0;
      }
    </style>
    <style \${nonceAttribute}>\${css}</style>
  </head>
  <body>
    <script \${nonceAttribute}>\${javascript}</script>
    <script \${nonceAttribute}>
      GraphQLHelixGraphiQL.init({
        defaultQuery: \${safeSerialize(defaultQuery)},
        defaultVariableEditorOpen: \${safeSerialize(defaultVariableEditorOpen)},
        endpoint: \${safeSerialize(endpoint)},
        headers: \${safeSerialize(headers)},
        headerEditorEnabled: \${safeSerialize(headerEditorEnabled)},
        subscriptionsEndpoint: \${safeSerialize(subscriptionsEndpoint)},
        useWebSocketLegacyProtocol: \${safeSerialize(useWebSocketLegacyProtocol)},
        hybridSubscriptionTransportConfig: \${safeSerialize(hybridSubscriptionTransportConfig)},
      });
    </script>
  </body>
</html>
\`;
};
`;

writeFileSync(resolve(__dirname, "../lib/render-graphiql.ts"), contents);
