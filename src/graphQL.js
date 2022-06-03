export default function graphQL(query) {
  const url = '/graphQL';
  const body = JSON.stringify({ query });

  return fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body,
    mode: 'cors',
  }).then(resp => resp.json());
}
