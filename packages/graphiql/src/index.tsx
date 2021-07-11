import { isLiveQueryOperationDefinitionNode } from "@n1ru4l/graphql-live-query";
import copyToClipboard from "copy-to-clipboard";
import { DocumentNode, Kind, parse } from "graphql";
import GraphiQL from "graphiql";
import React from "react";
import ReactDOM from "react-dom";
import { LoadFromUrlOptions, UrlLoader } from "@graphql-tools/url-loader";
import { isAsyncIterable } from "@graphql-tools/utils";
import { AsyncExecutor, Subscriber } from "@graphql-tools/delegate";
import { ToolbarDropDown } from "./drop-down";
import { Fetcher } from "graphiql/dist/components/GraphiQL";

export type HybridSubscriptionTransportConfig = {
  /* Enable SSE transport as an option */
  sse?: string;
  /* Enable Legacy graphql-ws protocol transport as an option. */
  legacyWS?: string;
  /* Enable graphql-transport-ws protocol transport as an option */
  transportWS?: string;
};
export interface Options {
  defaultQuery?: string;
  defaultVariableEditorOpen?: boolean;
  endpoint?: string;
  headers?: string;
  headerEditorEnabled?: boolean;
  subscriptionsEndpoint?: string;
  useWebSocketLegacyProtocol?: boolean;
  hybridSubscriptionTransportConfig?: {
    default: keyof HybridSubscriptionTransportConfig;
    config: HybridSubscriptionTransportConfig;
  };
}

const getOperationWithFragments = (
  document: DocumentNode,
  operationName: string
): {
  document: DocumentNode;
  isSubscriber: boolean;
} => {
  let isSubscriber = false;
  const definitions = document.definitions.filter((definition) => {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      if (operationName) {
        if (definition.name?.value !== operationName) {
          return false;
        }
      }
      if (
        definition.operation === "subscription" ||
        isLiveQueryOperationDefinitionNode(definition)
      ) {
        isSubscriber = true;
      }
    }
    return true;
  });
  return {
    document: {
      kind: Kind.DOCUMENT,
      definitions,
    },
    isSubscriber,
  };
};

const buildHybridMenuOptions = (
  hybridConfig: HybridSubscriptionTransportConfig
) => {
  const options: Array<{
    title: string;
    value: keyof HybridSubscriptionTransportConfig;
    url: string;
  }> = [];
  if (hybridConfig.sse) {
    options.push({
      value: "sse",
      title: "Subscriptions with SSE",
      url: hybridConfig.sse,
    });
  }
  if (hybridConfig.transportWS) {
    options.push({
      value: "transportWS",
      title: "Subscriptions with GraphQL over WebSocket",
      url: hybridConfig.transportWS,
    });
  }
  if (hybridConfig.legacyWS) {
    options.push({
      value: "legacyWS",
      title: "Subscriptions with GraphQL over WebSocket",
      url: hybridConfig.legacyWS,
    });
  }

  if (options.length === 0) {
    return null;
  }

  return options;
};

export const init = async ({
  defaultQuery,
  defaultVariableEditorOpen,
  endpoint = "/graphql",
  headers = "{}",
  headerEditorEnabled = true,
  subscriptionsEndpoint = endpoint,
  useWebSocketLegacyProtocol,
  hybridSubscriptionTransportConfig,
}: Options = {}) => {
  const urlLoader = new UrlLoader();

  const searchParams = new URLSearchParams(window.location.search);
  const initialOperationName = searchParams.get("operationName") || undefined;
  const initialQuery = searchParams.get("query") || undefined;
  const initialVariables = searchParams.get("variables") || "{}";

  const menuOptions =
    hybridSubscriptionTransportConfig &&
    buildHybridMenuOptions(hybridSubscriptionTransportConfig.config);
  let startHybridIndex: null | number = null;
  if (hybridSubscriptionTransportConfig && menuOptions) {
    startHybridIndex = menuOptions.findIndex(
      (option) => option.value === hybridSubscriptionTransportConfig.default
    );
    if (startHybridIndex === -1) {
      startHybridIndex = 0;
    }
  }

  ReactDOM.render(
    React.createElement(() => {
      const graphiqlRef = React.useRef<GraphiQL | null>(null);

      const [hybridTransportIndex, setHybridTransportIndex] = React.useState(
        startHybridIndex
      );
      const [networkInterface, setNetworkInterface] = React.useState<null | {
        executor: AsyncExecutor;
        subscriber: Subscriber;
      }>(null);

      React.useEffect(() => {
        let isCanceled = false;
        const options: LoadFromUrlOptions = {
          useSSEForSubscription: !subscriptionsEndpoint?.startsWith("ws"),
          specifiedByUrl: true,
          directiveIsRepeatable: true,
          schemaDescription: true,
          subscriptionsEndpoint,
          useWebSocketLegacyProtocol,
          headers: (executionParams) =>
            executionParams?.context?.headers || JSON.parse(headers),
        };

        if (menuOptions && hybridTransportIndex) {
          const target = menuOptions[hybridTransportIndex];
          if (target.value === "sse") {
            options.useSSEForSubscription = true;
            options.subscriptionsEndpoint = target.url;
            useWebSocketLegacyProtocol = undefined;
          } else if (target.value === "legacyWS") {
            options.useSSEForSubscription = false;
            options.subscriptionsEndpoint = target.url;
            useWebSocketLegacyProtocol = true;
          } else if (target.value === "transportWS") {
            options.useSSEForSubscription = false;
            options.subscriptionsEndpoint = target.url;
            useWebSocketLegacyProtocol = false;
          }
        }

        urlLoader
          .getExecutorAndSubscriberAsync(endpoint, options)
          .then((networkInterface) => {
            if (isCanceled) {
              return;
            }
            setNetworkInterface(networkInterface);
          })
          .catch(console.error);

        return () => {
          isCanceled = true;
        };
      }, [menuOptions, hybridTransportIndex]);

      const onShare = () => {
        const state = graphiqlRef.current?.state;

        console.log({
          a: state?.query,
          b: state?.variables,
          c: state?.operationName,
        });

        copyToClipboard(
          urlLoader.prepareGETUrl({
            baseUrl: window.location.href,
            query: state?.query || "",
            variables: state?.variables,
            operationName: state?.operationName,
          })
        );
      };

      const fetcher = React.useMemo<null | Fetcher>(() => {
        if (!networkInterface) {
          return null;
        }
        const { subscriber, executor } = networkInterface;
        return (graphQLParams, opts) => ({
          subscribe: (observer) => {
            let stopSubscription = () => {};
            Promise.resolve().then(async () => {
              try {
                const {
                  document: filteredDocument,
                  isSubscriber,
                } = getOperationWithFragments(
                  parse(graphQLParams.query),
                  graphQLParams.operationName
                );
                const executionParams = {
                  document: filteredDocument,
                  variables: graphQLParams.variables,
                  context: {
                    headers: opts?.headers || {},
                  },
                };
                const queryFn: any = isSubscriber ? subscriber : executor;
                const res = await queryFn(executionParams);
                if (isAsyncIterable(res)) {
                  const asyncIterable = res[Symbol.asyncIterator]();
                  if (asyncIterable.return) {
                    stopSubscription = () => {
                      asyncIterable.return!();
                      observer.complete();
                    };
                  }
                  for await (const part of res) {
                    observer.next(part);
                  }
                  observer.complete();
                } else if (typeof observer === "function") {
                  observer(res);
                } else {
                  observer.next(res);
                  observer.complete();
                }
              } catch (error) {
                let errorResult: any;
                if (typeof error.json === "function") {
                  errorResult = await error.json();
                } else {
                  errorResult = error;
                }
                if (typeof observer === "function") {
                  throw errorResult;
                } else {
                  observer.error(errorResult);
                }
              }
            });
            return { unsubscribe: () => stopSubscription() };
          },
        });
      }, [networkInterface]);

      return fetcher ? (
        <GraphiQL
          defaultQuery={defaultQuery}
          defaultVariableEditorOpen={defaultVariableEditorOpen}
          fetcher={fetcher}
          headers={headers}
          headerEditorEnabled={headerEditorEnabled}
          operationName={initialOperationName}
          query={initialQuery}
          ref={graphiqlRef}
          toolbar={{
            additionalContent: (
              <>
                <button className="toolbar-button" onClick={onShare}>
                  Share
                </button>
                {menuOptions && hybridTransportIndex != null && (
                  <ToolbarDropDown
                    options={menuOptions}
                    activeOptionIndex={hybridTransportIndex}
                    onSelectOption={(index) => {
                      setHybridTransportIndex(index);
                    }}
                  />
                )}
              </>
            ),
          }}
          variables={initialVariables}
        />
      ) : null;
    }, {}),
    document.body
  );
};
