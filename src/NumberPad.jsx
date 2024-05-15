import { Button, Stack } from 'react-bootstrap';
import { useState } from 'preact/hooks';

export function NumberPad(props) {
  const [number, setNumber] = useState('');
  const rows = [0, 1, 2, 3];
  const columns = [0, 1, 2];
  const values = [1, 4, 7, 'C', 2, 5, 8, 0, 3, 6, 9, '⌫'];

  function buttonPress(value) {
    let newNumber;
    if (value == 'C') {
      newNumber = '';
    } else if (value == '⌫') {
      newNumber = number.slice(0, -1);
    } else { // 0-9
      newNumber = `${number}${value}`.slice(-4, 5);
    }

    setNumber(newNumber);
    props.onChange(newNumber);
  }

  const stringToRender = `${number}____`.slice(0, 4);

  return (
    <>
      {/*
      <Row >
        {
          Array.from(stringToRender).map( (d, i) => (
            <Col className='volunteerNumbers' key={i} sm={1}>
              <span>{d}</span>
            </Col>
          ))
        }
      </Row>
      */}
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
