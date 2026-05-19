import { getLMSCourse } from "../../src/graphql/queries";

const getPPCLibraryQuery = /* GraphQL */ `
  query PpcLibraryBySlug {
    customerLibariesBySlug(slug: "ppc") {
      items {
        email
        displayName
        description
        addOns
        backgroundImage
        highlightColor
        id
        link
        code
        logo
        pdf
        primaryColor
        pschoolCourses {
          items {
            altLink
            callout
            category
            categoryArray
            courseId
            demo
            hours
            id
            lessons
            link
            objectives
            preview
            price
            seoImage
            shortDescription
            slug
            stripeLink
            subheadline
            thinkificId
            title
            type
            videos
            what_learned
          }
        }
        slide
        slug
        status
        video
      }
    }
  }
`;

const getLOTMQuery = /* GraphQL */ `
  query LotmList($limit: Int, $nextToken: String) {
    listLessons(
      limit: $limit
      filter: { status: { eq: "PUBLISHED" }, type: { eq: LOTM } }
      nextToken: $nextToken
    ) {
      items {
        author
        backdate
        content
        createdAt
        id
        objectives
        screengrab
        seoImage
        slug
        tags {
          items {
            tags {
              id
              tag
            }
          }
        }
        title
        type
        subhead
      }
      nextToken
    }
  }
`;

const minimalCreateOrderMutation = /* GraphQL */ `
  mutation CreateOrderMinimal($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      email
      name
      userID
      total
      status
      courseName
      courseLink
      courseImage
      courseDiscount
      courseDescription
      type
      paymentPlan
      ipAddress
      country
      device
      page
      createdAt
      updatedAt
    }
  }
`;

function getGraphqlConfigs() {
  const configs = [];

  function addConfig(endpoint, apiKey, source) {
    if (!endpoint || !apiKey) return;
    if (configs.some((config) => config.endpoint === endpoint && config.apiKey === apiKey)) {
      return;
    }
    configs.push({ endpoint, apiKey, source });
  }

  addConfig(process.env.GRAPHQL_ENDPOINT, process.env.GRAPHQL_API_KEY, "env-graphql");
  addConfig(
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
    process.env.NEXT_PUBLIC_GRAPHQL_API_KEY,
    "env-next-public",
  );
  addConfig(
    process.env.AWS_APPSYNC_GRAPHQL_ENDPOINT,
    process.env.AWS_APPSYNC_API_KEY,
    "env-aws-appsync",
  );
  addConfig(
    process.env.NEXT_PUBLIC_AWS_APPSYNC_GRAPHQL_ENDPOINT,
    process.env.NEXT_PUBLIC_AWS_APPSYNC_API_KEY,
    "env-next-public-aws-appsync",
  );
  addConfig(
    process.env.aws_appsync_graphqlEndpoint,
    process.env.aws_appsync_apiKey,
    "env-appsync",
  );

  if (configs.length === 0) {
    throw new Error("Missing GraphQL endpoint/key configuration.");
  }

  return configs;
}

async function runGraphQL(query, variables = {}) {
  const configs = getGraphqlConfigs();
  let lastError = null;

  for (const { endpoint, apiKey, source } of configs) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    if (!response.ok) {
      lastError = new Error(
        `GraphQL request failed with status ${response.status} using ${source}.`,
      );
      continue;
    }

    const json = await response.json();
    if (json.errors?.length) {
      lastError = new Error(
        json.errors[0].message || `GraphQL returned errors using ${source}.`,
      );
      continue;
    }

    return json.data;
  }

  throw lastError || new Error("GraphQL request failed for all configured endpoints.");
}

export async function getPPCLibrary() {
  const data = await runGraphQL(getPPCLibraryQuery);
  return data?.customerLibariesBySlug?.items?.[0] ?? null;
}

export async function getAllLearningOfTheMonths() {
  const PAGE_SIZE = 100;
  const allItems = [];
  let nextToken = null;

  do {
    const data = await runGraphQL(getLOTMQuery, { limit: PAGE_SIZE, nextToken });
    const list = data?.listLessons;
    const items = list?.items ?? [];
    allItems.push(...items);
    nextToken = list?.nextToken ?? null;
  } while (nextToken);

  return allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getCourseByID(id) {
  const data = await runGraphQL(getLMSCourse, { id });
  return data?.getLMSCourse ?? null;
}

export async function createNewOrder(input) {
  const data = await runGraphQL(minimalCreateOrderMutation, { input });
  return data?.createOrder ?? null;
}

export function getDeviceType() {
  if (typeof window === "undefined" || !window.navigator) return "unknown";
  const ua = window.navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "tablet";
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua,
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

export const cpsCourses = [
  "ff174f01-5f76-486c-8d7a-849d6d3ff914",
  "672c1d2b-ba6c-4e02-8c34-83e8c3e4f7b3",
  "2418801f-a352-4eae-a394-87a5c0c55f79",
  "4e6c079e-b396-4762-8b7f-4fa4dea64969",
  "f2fad11c-4548-41ea-b39d-be5a4913a4f5",
  "452ec0d8-7464-4bd6-bfc2-eab051a9b40b",
  "431ce262-cf48-4a7c-8ff1-2909f548149b",
  "5d84ef6e-3fa3-423d-8e33-67d32605cb93",
  "f2bd57ba-adbf-45ab-88f0-d68ac20c5b7e",
  "73139212-0b15-4d96-9942-1757fa058fdf",
  "e39e127a-11bc-448d-a8c0-209b3abbfdb9",
];

export async function getPpcPageData() {
  const [lib, lotm, courseDetails] = await Promise.all([
    getPPCLibrary(),
    getAllLearningOfTheMonths(),
    Promise.all(cpsCourses.slice(0, 8).map((id) => getCourseByID(id))),
  ]);

  const courses = courseDetails.filter(Boolean);
  return { lib, lotm, courses };
}

