import { Link } from 'react-router-dom';
import './Header.css';

export const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">Serverless API Framework</h1>
        <nav className="nav">
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/users" className="nav-link">
            Users
          </Link>
          <Link to="/email" className="nav-link">
            Email
          </Link>
        </nav>
      </div>
    </header>
  );
};
