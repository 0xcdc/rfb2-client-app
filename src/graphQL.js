class HTTPResponseError extends Error {
  constructor(response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`);
    this.response = response;
  }
}

class GraphQLError extends Error {
  constructor(response, message) {
    super(`GraphQL Error Response: ${message}`);
    this.response = response;
  }
}

const checkStatus = response => {
  if (response.ok) {
    // response.status >= 200 && response.status < 300
    return response;
  } else {
    throw new HTTPResponseError(response);
  }
}

export default async function graphQL(query, variables) {
  const url = '/graphQL';
  const body = JSON.stringify({ query, variables });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
    mode: 'cors',
  });
  try {
    checkStatus(response);
    const json = await response.json();
    if (json.errors) {
      throw new GraphQLError(response, json.errors[0].message);
    }
    return json;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
