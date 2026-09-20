import { render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';

/**
 * The ward registration review used to be a mock-only screen at
 * /ward/inbox/registrations/:id. It is now the live ward case screen, and the old
 * path redirects so bookmarks and notification deep links keep working.
 *
 * This mirrors the redirect declared in src/router.tsx rather than mounting the
 * whole router, which would pull in every feature screen.
 */
function LegacyRegistrationReviewRedirect() {
  const { id } = useParams();
  return <Navigate to={`/ward/inbox/reviews/registrations/${id}`} replace />;
}

describe('ward review routes', () => {
  it('redirects the legacy registration review path to the live case screen', () => {
    render(
      <MemoryRouter initialEntries={['/ward/inbox/registrations/7']}>
        <Routes>
          <Route
            path="/ward/inbox/registrations/:id"
            element={<LegacyRegistrationReviewRedirect />}
          />
          <Route
            path="/ward/inbox/reviews/:kind/:id"
            element={<LandedOn />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('landed')).toHaveTextContent('registrations/7');
  });
});

function LandedOn() {
  const { kind, id } = useParams();
  return <span data-testid="landed">{`${kind}/${id}`}</span>;
}
