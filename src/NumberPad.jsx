import { Button, Stack } from 'react-bootstrap';

export function NumberPad(props) {
  const rows = [0, 1, 2, 3];
  const columns = [0, 1, 2];
  const values = [1, 4, 7, 'C', 2, 5, 8, 0, 3, 6, 9, '⌫'];

  function buttonPress(value) {
    let newNumber;
    if (value == 'C') {
      newNumber = '';
    } else if (value == '⌫') {
      newNumber = props.number.slice(0, -1);
    } else { // 0-9
      newNumber = `${props.number}${value}`.slice(-4, 5);
    }

    props.onChange(newNumber);
  }

  const stringToRender = `${props.number}____`.slice(0, 4);

  return (
    <>
      <Stack gap={1} direction="horizontal" className="mx-auto">
        {
          Array.from(stringToRender).map( (d, i) => (
            <pre className='volunteerNumbers' key={i} sm={1}>
              {d}
            </pre>
          ))
        }
      </Stack>

      <Stack gap={3} direction="horizontal" className="mx-auto">
        {
          columns.map( c => {
            return (
              <Stack key={c} gap={3} >
                {
                  rows.map( r => {
                    const value = values.shift();
                    return (
                      <Button key={r}
                        className='selfServiceButton'
                        onClick={() => buttonPress(value)}
                      >
                        {value}
                      </Button>
                    );
                  })
                }
              </Stack>
            );
          })
        }
      </Stack>
    </>
  );
}
