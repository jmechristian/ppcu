import { NextResponse } from "next/server";

const GRAPHQL_URL =
  process.env.THINKIFIC_GRAPHQL_URL || "https://api.thinkific.com/stable/graphql";
const COURSE_OUTLINE_CACHE_TTL_MS = 1000 * 60 * 15;
const courseOutlineCache = new Map();

const COURSE_OUTLINE_QUERY = `
  query Course($courseId: ID!, $first: Int, $lessonsFirst: Int) {
    course(id: $courseId) {
      id
      description
      name
      title
      instructor {
        fullName
        bio
        title
      }
      curriculum {
        chaptersCount
        lessonsCount
        totalVideoContentTime
        chapters(first: $first) {
          edges {
            node {
              id
              title
              position
              lessons(first: $lessonsFirst) {
                edges {
                  node {
                    id
                    title
                    lessonType
                  }
                }
              }
            }
          }
        }
      }
      product {
        cardImageUrl
        checkoutUrl
        primaryPrice {
          displayPrice
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

async function fetchCourseOutlineWithRetry(query, variables, apiKey) {
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

function normalizeCourse(rawCourse) {
  const chapters =
    rawCourse?.curriculum?.chapters?.edges
      ?.map((edge) => edge?.node)
      .filter(Boolean)
      .sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))
      .map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        position: chapter.position,
        lessons:
          chapter.lessons?.edges
            ?.map((lessonEdge) => lessonEdge?.node)
            .filter(Boolean)
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              lessonType: lesson.lessonType,
            })) || [],
      })) || [];

  return {
    id: rawCourse?.id,
    title: rawCourse?.title || rawCourse?.name || "Course",
    description: rawCourse?.description || "",
    instructor: {
      fullName: rawCourse?.instructor?.fullName || "",
      title: rawCourse?.instructor?.title || "",
      bio: rawCourse?.instructor?.bio || "",
    },
    curriculum: {
      chaptersCount: rawCourse?.curriculum?.chaptersCount ?? chapters.length,
      lessonsCount: rawCourse?.curriculum?.lessonsCount ?? 0,
      totalVideoContentTime: rawCourse?.curriculum?.totalVideoContentTime ?? null,
      chapters,
    },
    product: {
      cardImageUrl: rawCourse?.product?.cardImageUrl || "",
      checkoutUrl: rawCourse?.product?.checkoutUrl || "",
      displayPrice: rawCourse?.product?.primaryPrice?.displayPrice || "",
    },
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get("id");
  const courseId =
    requestedId?.trim() ||
    process.env.THINKIFIC_COURSE_ID ||
    process.env.NEXT_PUBLIC_THINKIFIC_COURSE_ID ||
    "";

  if (!courseId) {
    return NextResponse.json(
      {
        message: "error",
        error:
          "Missing Thinkific course id. Set THINKIFIC_COURSE_ID or pass ?id= in the request.",
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

  const cacheKey = String(courseId).trim();
  const cached = courseOutlineCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      message: "success",
      data: cached.data,
      fromCache: true,
    });
  }

  const variables = {
    first: 100,
    lessonsFirst: 100,
    courseId: cacheKey,
  };

  try {
    const { response, json } = await fetchCourseOutlineWithRetry(
      COURSE_OUTLINE_QUERY,
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

    const rawCourse = json?.data?.course;
    if (!rawCourse) {
      return NextResponse.json(
        {
          message: "error",
          error: "No course returned for the provided Thinkific course id.",
        },
        { status: 404 },
      );
    }

    const normalizedCourse = normalizeCourse(rawCourse);
    courseOutlineCache.set(cacheKey, {
      data: normalizedCourse,
      expiresAt: Date.now() + COURSE_OUTLINE_CACHE_TTL_MS,
    });

    return NextResponse.json({
      message: "success",
      data: normalizedCourse,
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
