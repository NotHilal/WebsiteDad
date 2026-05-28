import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="page-header">
        <h1>404</h1>
        <div className="breadcrumb">
          <span>Home</span>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span>Page Not Found</span>
        </div>
      </div>
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '32px', lineHeight: 1.8 }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="btn">Back to Home</Link>
      </div>
    </div>
  );
}
