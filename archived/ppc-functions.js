export const getPPCLibrary = async () => {
  const getPPCLibraryQuery = /* GraphQL */ `
    query MyQuery {
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
  const res = await API.graphql({
    query: getPPCLibraryQuery,
    variables: { slug: 'ppc' },
  });
  return res.data.customerLibariesBySlug.items[0];
};

export const getAllLearningOfTheMonths = async () => {
  const PAGE_SIZE = 100; // AppSync often caps list at 100 per request
  const getLOTMQuery = /* GraphQL */ `
    query MyQuery($limit: Int, $nextToken: String) {
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

  let allItems = [];
  let nextToken = null;

  do {
    const result = await API.graphql({
      query: getLOTMQuery,
      variables: { limit: PAGE_SIZE, nextToken },
    });

    const list = result?.data?.listLessons;
    const items = list?.items ?? [];
    allItems = allItems.concat(items);
    nextToken = list?.nextToken ?? null;
  } while (nextToken);

  return allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getCourseByID = async (id) => {
  const res = await API.graphql({
    query: getLMSCourse,
    variables: { id: id },
  });
  return res.data.getLMSCourse;
};

export const createNewOrder = async (data) => {
  // Minimal selection to avoid nested User relationships (e.g. apss) that can
  // break in environments without certain GSIs.
  const minimalCreateOrder = /* GraphQL */ `
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

  const res = await API.graphql({
    query: minimalCreateOrder,
    variables: { input: data },
  });
  return res.data.createOrder;
};

export const getDeviceType = () => {
  if (typeof window === 'undefined' || !window.navigator) {
    return 'unknown';
  }

  const ua = window.navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  } else if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua,
    )
  ) {
    return 'mobile';
  }
  return 'desktop';
};

export const cpsCourses = [
  'ff174f01-5f76-486c-8d7a-849d6d3ff914',
  '672c1d2b-ba6c-4e02-8c34-83e8c3e4f7b3',
  '2418801f-a352-4eae-a394-87a5c0c55f79',
  '4e6c079e-b396-4762-8b7f-4fa4dea64969',
  'f2fad11c-4548-41ea-b39d-be5a4913a4f5',
  '452ec0d8-7464-4bd6-bfc2-eab051a9b40b',
  '431ce262-cf48-4a7c-8ff1-2909f548149b',
  '5d84ef6e-3fa3-423d-8e33-67d32605cb93',
  'f2bd57ba-adbf-45ab-88f0-d68ac20c5b7e',
  '73139212-0b15-4d96-9942-1757fa058fdf',
  'e39e127a-11bc-448d-a8c0-209b3abbfdb9',
];
