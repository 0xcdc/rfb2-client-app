/*

Async graphQL funciton and error handling code we might add in later if it seems helpful

class HTTPResponseError extends Error {
  constructor(response) {
    super(`HTTP Error Response: ${response.status} ${response.statusText}`);
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

async function graphQL(query, key) {
  const url = `/graphQL`;
  const body = JSON.stringify({ query });

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body,
  });
  try {
    checkStatus(response);
    let json = await response.json();
    return json.data[key];
  } catch (error) {
    console.error(error);

    const errorBody = await error.response.text();
    console.error(`Error body: ${errorBody}`);
  }
}

*/

export default function graphQL(query) {
  const url = '/graphQL';
  const body = JSON.stringify({ query });

  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
    mode: 'cors',
  }).then(resp => resp.json());
}
