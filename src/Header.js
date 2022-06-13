import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <div>
      <Link to="/">
        <Button>
          Home <i class="bi bi-house-door-fill"></i>
        </Button>
      </Link>
      <Link to="/report">
        <Button>
          Reports <i class="bi bi-journal-richtext"></i>
        </Button>
      </Link>
      <br />
      <Link to="/">
        <img
          src="/default-logo.png"
          className="img-responsive"
          alt="Renewal Food Bank Logo"
        />
      </Link>
    </div>
  );
}
