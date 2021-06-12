let myFetch = createFetch(fetch, {
  baseUrl: 'http://localhost:4000',
});

export default function graphQL(query) {
  return myFetch('/graphql', {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
    }),
    credentials: 'omit',
  }).then(resp => {
    return resp.json();
  });
};

function createFetch(
  fetchArg,
  { baseUrl, cookie, schema, graphql }: Options,
) {
  // NOTE: Tweak the default options to suite your application needs
  const defaults = {
    method: 'POST', // handy with GraphQL backends
    mode: baseUrl ? 'cors' : 'same-origin',
    credentials: baseUrl ? 'include' : 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : null),
    },
  };

  return async (url: string, options: any) => {
    const isGraphQL = url.startsWith('/graphql');
    if (schema && graphql && isGraphQL) {
      // We're SSR, so route the graphql internal to avoid latency
      const query = JSON.parse(options.body);
      const result = await graphql(
        schema,
        query.query,
        { request: {} }, // fill in request vars needed by graphql
        null,
        query.variables,
      );
      return Promise.resolve({
        status: result.errors ? 400 : 200,
        json: () => Promise.resolve(result),
      });
    }

    return isGraphQL || url.startsWith('/api')
      ? fetchArg(`${baseUrl}${url}`, {
          ...defaults,
          ...options,
          headers: {
            ...defaults.headers,
            ...(options && options.headers),
          },
        })
      : fetchArg(url, options);
  };
}
