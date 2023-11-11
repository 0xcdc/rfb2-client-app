import { Container } from 'react-bootstrap';


function cancelPopup(e) {
  e.preventDefault();
}

export default function Layout({ children }) {
  return (
    <Container id='Layout' fluid="xl" onContextMenu={cancelPopup}>
      {children}
    </Container>
  );
}
