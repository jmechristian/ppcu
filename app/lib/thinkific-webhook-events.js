import { runGraphQL } from "./graphql-client";

const WEBHOOK_EVENT_FIELDS = `
  id
  eventId
  resource
  action
  tenantId
  eventCreatedAt
  email
  firstName
  lastName
  thinkificUserId
  thinkificEnrollmentId
  thinkificCourseId
  status
  retryCount
  growthzoneContactId
  growthzoneCertificationContactId
  error
  processingNotes
  createdAt
  updatedAt
`;

const GET_EVENT_QUERY = /* GraphQL */ `
  query GetThinkificEnrollmentWebhookEvent($id: ID!) {
    getThinkificEnrollmentWebhookEvent(id: $id) {
      ${WEBHOOK_EVENT_FIELDS}
    }
  }
`;

const CREATE_EVENT_MUTATION = /* GraphQL */ `
  mutation CreateThinkificEnrollmentWebhookEvent(
    $input: CreateThinkificEnrollmentWebhookEventInput!
  ) {
    createThinkificEnrollmentWebhookEvent(input: $input) {
      ${WEBHOOK_EVENT_FIELDS}
    }
  }
`;

const UPDATE_EVENT_MUTATION = /* GraphQL */ `
  mutation UpdateThinkificEnrollmentWebhookEvent(
    $input: UpdateThinkificEnrollmentWebhookEventInput!
  ) {
    updateThinkificEnrollmentWebhookEvent(input: $input) {
      ${WEBHOOK_EVENT_FIELDS}
    }
  }
`;

export async function getWebhookEventById(eventId) {
  const data = await runGraphQL(GET_EVENT_QUERY, { id: eventId });
  return data?.getThinkificEnrollmentWebhookEvent || null;
}

export async function createWebhookEvent(input) {
  const data = await runGraphQL(CREATE_EVENT_MUTATION, { input });
  return data?.createThinkificEnrollmentWebhookEvent || null;
}

export async function updateWebhookEvent(input) {
  const data = await runGraphQL(UPDATE_EVENT_MUTATION, { input });
  return data?.updateThinkificEnrollmentWebhookEvent || null;
}
