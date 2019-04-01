import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { tryCatch } from 'fp-ts/lib/TaskEither';
import { queryShallow, available } from '../../src/DSL';
import { useQuery } from '../../src/react';

interface User {
  first_name: string;
  last_name: string;
}

const fetchUser = (userId: number) =>
  tryCatch(
    () =>
      fetch(`https://reqres.in/api/users/${userId}`)
        .then(r =>
          r.status === 200 ? r.json() : Promise.reject('request failed')
        )
        .then(r => r.data as User),
    err => err
  );

const userQuery = queryShallow(fetchUser, available);

function App() {
  const [length, setLength] = React.useState(10);

  const user = useQuery(userQuery, length);

  return (
    <div>
      <input
        type="number"
        value={length}
        onChange={ev => setLength(parseInt(ev.target.value))}
      />
      {user.fold(
        'loading...',
        err => `something went wrong: ${err}`,
        user => `Hello ${user.first_name}!`
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('app'));
