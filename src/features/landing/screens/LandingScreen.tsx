import { EmptySlotCta } from '../components/EmptySlotCta';
import { KerbSteps } from '../components/KerbSteps';
import { LandingFaq } from '../components/LandingFaq';
import { LandingFooter } from '../components/LandingFooter';
import { LandingHeader } from '../components/LandingHeader';
import { RoleDoors } from '../components/RoleDoors';
import { StreetHero } from '../components/StreetHero';
import { WardBand } from '../components/WardBand';

/**
 * Public front door for guests at `/`. Signed-in users are redirected to their
 * role home. Bright and editorial: a real street with order painted onto it,
 * one door per role, three steps on a kerb, a band for the ward, then an empty
 * slot inviting the visitor in. No API calls: everything here is static.
 */
export function LandingScreen() {
  return (
    <div data-surface="CUSTOMER" className="min-h-full bg-bg">
      <LandingHeader />
      <main id="noi-dung" tabIndex={-1} className="outline-none">
        <StreetHero />
        <div aria-hidden="true" className="sb-kerb" />
        <RoleDoors />
        <KerbSteps />
        <WardBand />
        <LandingFaq />
        <EmptySlotCta />
      </main>
      <LandingFooter />
    </div>
  );
}
