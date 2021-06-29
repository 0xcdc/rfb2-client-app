export default function graphQL(query) {
  let url = '/graphQL';
  let body = JSON.stringify({query});

  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body,
    mode: 'cors',
    credentials: 'omit',
  }).then(resp => {
    return resp.json();
  });
};
