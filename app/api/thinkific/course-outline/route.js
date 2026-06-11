import { NextResponse } from "next/server";

const GRAPHQL_URL =
  process.env.THINKIFIC_GRAPHQL_URL || "https://api.thinkific.com/stable/graphql";
const OUTLINE_CACHE_TTL_MS = 1000 * 60 * 15;
const outlineCache = new Map();

const OUTLINE_QUERY = `
  query Bundle($bundleId: ID!, $first: Int, $chaptersFirst: Int) {
    bundle(id: $bundleId) {
      cardImage {
        url
      }
      name
      product {
        cardImageUrl
        checkoutUrl
        description
        id
        name
        primaryPrice {
          amount
          currency
          displayPrice
        }
        resumeUrl
      }
      items(first: $first) {
        nodes {
          ... on Course {
            id
            cardImage {
              url
            }
            curriculum {
              chapters(first: $chaptersFirst) {
                nodes {
                  title
                  position
                  id
                }
              }
              chaptersCount
              lessonsCount
              totalVideoContentTime
            }
            description
            instructor {
              fullName
            }
            name
            title
          }
        }
      }
    }
  }
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(response, json) {
  if (response?.status === 429) return true;
  const errors = json?.errors;
  if (!Array.isArray(errors)) return false;
  return errors.some((err) => String(err?.message || "").includes("429"));
}

async function fetchOutlineWithRetry(query, variables, apiKey) {
  let lastResponse;
  let lastJson = {};
  const backoffMs = [200, 500, 1000];

  for (let i = 0; i < backoffMs.length; i += 1) {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));
    lastResponse = response;
    lastJson = json;

    if (!isRateLimited(response, json)) {
      return { response, json };
    }

    if (i < backoffMs.length - 1) {
      await sleep(backoffMs[i]);
    }
  }

  return { response: lastResponse, json: lastJson };
}

function normalizeBundle(rawBundle) {
  const courses =
    rawBundle?.items?.nodes
      ?.filter(Boolean)
      .map((course, index) => {
        const chapters =
          course?.curriculum?.chapters?.nodes
            ?.filter(Boolean)
            .sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))
            .map((chapter) => ({
              id: chapter.id,
              title: chapter.title,
              position: chapter.position,
            })) || [];

        return {
          id: course?.id || `${course?.title || course?.name || "course"}-${index}`,
          title: course?.title || course?.name || `Course ${index + 1}`,
          description: course?.description || "",
          instructor: {
            fullName: course?.instructor?.fullName || "",
          },
          cardImageUrl: course?.cardImage?.url || "",
          curriculum: {
            chaptersCount: course?.curriculum?.chaptersCount ?? chapters.length,
            lessonsCount: course?.curriculum?.lessonsCount ?? 0,
            totalVideoContentTime: course?.curriculum?.totalVideoContentTime ?? 0,
            chapters,
          },
        };
      }) || [];

  const totals = courses.reduce(
    (acc, course) => {
      acc.coursesCount += 1;
      acc.chaptersCount += Number(course.curriculum?.chaptersCount || 0);
      acc.lessonsCount += Number(course.curriculum?.lessonsCount || 0);
      acc.totalVideoContentTime += Number(course.curriculum?.totalVideoContentTime || 0);
      return acc;
    },
    { coursesCount: 0, chaptersCount: 0, lessonsCount: 0, totalVideoContentTime: 0 },
  );

  return {
    id: rawBundle?.product?.id || rawBundle?.name || "bundle",
    title: rawBundle?.name || rawBundle?.product?.name || "Program Bundle",
    description: rawBundle?.product?.description || "",
    courses,
    totals,
    product: {
      cardImageUrl: rawBundle?.product?.cardImageUrl || rawBundle?.cardImage?.url || "",
      checkoutUrl: rawBundle?.product?.checkoutUrl || "",
      resumeUrl: rawBundle?.product?.resumeUrl || "",
      displayPrice: rawBundle?.product?.primaryPrice?.displayPrice || "",
      amount: rawBundle?.product?.primaryPrice?.amount ?? null,
      currency: rawBundle?.product?.primaryPrice?.currency || "",
    },
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get("id");
  const bundleId =
    requestedId?.trim() ||
    process.env.THINKIFIC_BUNDLE_ID ||
    process.env.NEXT_PUBLIC_THINKIFIC_BUNDLE_ID ||
    "424513";

  if (!bundleId) {
    return NextResponse.json(
      {
        message: "error",
        error:
          "Missing Thinkific bundle id. Set THINKIFIC_BUNDLE_ID or pass ?id= in the request.",
      },
      { status: 400 },
    );
  }

  const apiKey =
    process.env.THINKIFIC_API_KEY ||
    process.env.NEXT_THINKIFIC_PUBLIC_API_KEY ||
    process.env.NEXT_PUBLIC_THINKIFIC_PUBLIC_API_KEY ||
    "";

  if (!apiKey) {
    return NextResponse.json(
      {
        message: "error",
        error:
          "Missing Thinkific API key. Set THINKIFIC_API_KEY (or NEXT_THINKIFIC_PUBLIC_API_KEY).",
      },
      { status: 500 },
    );
  }

  const cacheKey = String(bundleId).trim();
  const cached = outlineCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      message: "success",
      data: cached.data,
      fromCache: true,
    });
  }

  const variables = {
    first: 100,
    chaptersFirst: 100,
    bundleId: cacheKey,
  };

  try {
    const { response, json } = await fetchOutlineWithRetry(
      OUTLINE_QUERY,
      variables,
      apiKey,
    );

    if (!response?.ok) {
      return NextResponse.json(
        {
          message: "error",
          error: json?.message || `Request failed with status ${response?.status || 500}`,
        },
        { status: response?.status || 500 },
      );
    }

    if (Array.isArray(json?.errors) && json.errors.length > 0) {
      return NextResponse.json(
        {
          message: "error",
          error: json.errors[0]?.message || "GraphQL error",
          errors: json.errors,
        },
        { status: 400 },
      );
    }

    const rawBundle = json?.data?.bundle;
    if (!rawBundle) {
      return NextResponse.json(
        {
          message: "error",
          error: "No bundle returned for the provided Thinkific bundle id.",
        },
        { status: 404 },
      );
    }

    const normalizedBundle = normalizeBundle(rawBundle);
    outlineCache.set(cacheKey, {
      data: normalizedBundle,
      expiresAt: Date.now() + OUTLINE_CACHE_TTL_MS,
    });

    return NextResponse.json({
      message: "success",
      data: normalizedBundle,
      fromCache: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "error",
        error: error?.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}
