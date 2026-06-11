function cleanEnvValue(value) {
  if (value == null) return "";
  return String(value).trim().replace(/^['"]|['"]$/g, "");
}

function normalizeEndpoint(endpoint) {
  const cleanedEndpoint = cleanEnvValue(endpoint);
  if (!cleanedEndpoint) return null;
  try {
    const url = new URL(cleanedEndpoint);
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/graphql";
    }
    return url.toString();
  } catch {
    return null;
  }
}

function getGraphqlConfigs() {
  const configs = [];

  function addConfig(endpoint, apiKey, source) {
    const cleanedApiKey = cleanEnvValue(apiKey);
    if (!cleanedApiKey) return;
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    if (!normalizedEndpoint) return;
    if (
      configs.some(
        (config) => config.endpoint === normalizedEndpoint && config.apiKey === cleanedApiKey,
      )
    ) {
      return;
    }
    configs.push({ endpoint: normalizedEndpoint, apiKey: cleanedApiKey, source });
  }

  addConfig(process.env.GRAPHQL_ENDPOINT, process.env.GRAPHQL_API_KEY, "env-graphql");
  addConfig(
    process.env.GRAPHQL_ENDPOINT,
    process.env.NEXT_PUBLIC_GRAPHQL_API_KEY,
    "env-graphql-next-public-graphql-key",
  );
  addConfig(process.env.GRAPHQL_ENDPOINT, process.env.AWS_APPSYNC_API_KEY, "env-graphql-aws-key");
  addConfig(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT, process.env.NEXT_PUBLIC_GRAPHQL_API_KEY, "env-next-public");
  addConfig(process.env.AWS_APPSYNC_GRAPHQL_ENDPOINT, process.env.AWS_APPSYNC_API_KEY, "env-aws-appsync");
  addConfig(
    process.env.NEXT_PUBLIC_AWS_APPSYNC_GRAPHQL_ENDPOINT,
    process.env.NEXT_PUBLIC_AWS_APPSYNC_API_KEY,
    "env-next-public-aws-appsync",
  );
  addConfig(process.env.aws_appsync_graphqlEndpoint, process.env.aws_appsync_apiKey, "env-appsync");

  if (configs.length === 0) {
    throw new Error("Missing GraphQL endpoint/key configuration.");
  }

  return configs;
}

function shouldRetryStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

export async function runGraphQL(query, variables = {}) {
  const configs = getGraphqlConfigs();
  let lastError = null;

  for (const { endpoint, apiKey, source } of configs) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({ query, variables }),
          cache: "no-store",
        });
      } catch (error) {
        lastError = new Error(
          `GraphQL network request failed using ${source} (${endpoint}): ${error?.message || "unknown error"}`,
        );
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, [200, 500, 1000][attempt]));
          continue;
        }
        break;
      }

      if (!response.ok) {
        lastError = new Error(`GraphQL request failed with status ${response.status} using ${source}.`);
        if (shouldRetryStatus(response.status) && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, [200, 500, 1000][attempt]));
          continue;
        }
        break;
      }

      const json = await response.json();
      if (json.errors?.length) {
        const message = json.errors[0]?.message || `GraphQL returned errors using ${source}.`;
        lastError = new Error(message);
        const retryable = /timeout|throttle|429|rate/i.test(message);
        if (retryable && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, [200, 500, 1000][attempt]));
          continue;
        }
        break;
      }

      return json.data;
    }
  }

  throw lastError || new Error("GraphQL request failed for all configured endpoints.");
}
