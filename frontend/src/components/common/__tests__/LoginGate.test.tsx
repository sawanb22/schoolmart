import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginGate, { useRequireLogin } from '../LoginGate';

const USER = { id: 7, name: 'Test User', email: 'user@example.com', role: 'user' };

const loginAs = () => {
  localStorage.setItem('cm_token', 'token-123');
  localStorage.setItem('cm_user', JSON.stringify(USER));
};

const renderGate = (entry = '/contact-us?topic=labs') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <LoginGate>
        <form aria-label="enquiry form">
          <button type="submit">Send</button>
        </form>
      </LoginGate>
    </MemoryRouter>
  );

describe('LoginGate', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('hides children and shows login / create account links when logged out', () => {
    renderGate();

    expect(screen.queryByRole('form', { name: 'enquiry form' })).not.toBeInTheDocument();
    expect(screen.getByText('Please log in to continue')).toBeInTheDocument();
    expect(screen.getByText('Create a free account or log in to fill this form.')).toBeInTheDocument();

    const redirect = encodeURIComponent('/contact-us?topic=labs');
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', `/login?redirect=${redirect}`);
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute(
      'href',
      `/registration?redirect=${redirect}`
    );
  });

  it('renders children when a user session exists', () => {
    loginAs();
    renderGate();

    expect(screen.getByRole('form', { name: 'enquiry form' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('treats a token without a user object as logged out', () => {
    localStorage.setItem('cm_token', 'token-123');
    renderGate();

    expect(screen.queryByRole('form', { name: 'enquiry form' })).not.toBeInTheDocument();
  });

  it('shows the form after a login in another tab (storage event)', () => {
    renderGate();
    expect(screen.queryByRole('form', { name: 'enquiry form' })).not.toBeInTheDocument();

    act(() => {
      loginAs();
      window.dispatchEvent(new Event('storage'));
    });

    expect(screen.getByRole('form', { name: 'enquiry form' })).toBeInTheDocument();
  });

  it('accepts a custom title and message', () => {
    render(
      <MemoryRouter>
        <LoginGate title="Sign in to apply" message="Accounts keep applications genuine.">
          <p>secret</p>
        </LoginGate>
      </MemoryRouter>
    );

    expect(screen.getByText('Sign in to apply')).toBeInTheDocument();
    expect(screen.getByText('Accounts keep applications genuine.')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});

describe('useRequireLogin', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const Probe = () => {
    const { loggedIn, loginHref, registerHref } = useRequireLogin();
    return (
      <div>
        <span data-testid="state">{loggedIn ? 'in' : 'out'}</span>
        <span data-testid="login">{loginHref}</span>
        <span data-testid="register">{registerHref}</span>
      </div>
    );
  };

  it('returns state and redirect hrefs for the current location', () => {
    render(
      <MemoryRouter initialEntries={['/partnership']}>
        <Probe />
      </MemoryRouter>
    );

    expect(screen.getByTestId('state')).toHaveTextContent('out');
    expect(screen.getByTestId('login')).toHaveTextContent('/login?redirect=%2Fpartnership');
    expect(screen.getByTestId('register')).toHaveTextContent('/registration?redirect=%2Fpartnership');
  });

  it('updates when the auth changed event fires', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>
    );
    expect(screen.getByTestId('state')).toHaveTextContent('out');

    act(() => {
      loginAs();
      window.dispatchEvent(new Event('cm_auth_changed'));
    });

    expect(screen.getByTestId('state')).toHaveTextContent('in');
  });
});
