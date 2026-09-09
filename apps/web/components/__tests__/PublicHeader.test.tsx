import { render, screen } from '@testing-library/react';
import PublicHeader from '../PublicHeader';
import { useAuth } from '../../lib/auth-context';

jest.mock('../../lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = useAuth as jest.Mock;

describe('PublicHeader Admin Panel button', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is hidden when logged out', () => {
    mockedUseAuth.mockReturnValue({ user: null, logout: jest.fn() });

    render(<PublicHeader />);

    expect(screen.queryByRole('link', { name: /admin panel/i })).not.toBeInTheDocument();
  });

  it('is hidden for a regular customer', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: '1', email: 'customer@example.com', displayName: 'Cust', role: 'CUSTOMER' },
      logout: jest.fn(),
    });

    render(<PublicHeader />);

    expect(screen.queryByRole('link', { name: /admin panel/i })).not.toBeInTheDocument();
  });

  it('is visible for an admin and links to the pending top-ups queue', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: '2', email: 'kindlekkadin@gmail.com', displayName: 'Admin', role: 'ADMIN' },
      logout: jest.fn(),
    });

    render(<PublicHeader />);

    const link = screen.getByRole('link', { name: /admin panel/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/admin/pending-topups');
  });

  it('stays hidden for a non-admin even with the admin account email', () => {
    // Guards against gating on email instead of role — role is the only
    // source of truth for admin access, both here and on the server.
    mockedUseAuth.mockReturnValue({
      user: { id: '3', email: 'kindlekkadin@gmail.com', displayName: 'Not Admin', role: 'CUSTOMER' },
      logout: jest.fn(),
    });

    render(<PublicHeader />);

    expect(screen.queryByRole('link', { name: /admin panel/i })).not.toBeInTheDocument();
  });
});
