
export default function graphQL(query) {
  let baseUrl = 'http://localhost:4000';
  let url = '/graphQL';

  let body = JSON.stringify({query});

  return fetch(`${baseUrl}${url}`, {
    baseUrl,
    body,
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    mode: 'cors',
  }).then(resp => {
    return resp.json();
  });
};
